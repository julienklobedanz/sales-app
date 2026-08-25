'use client'

import * as React from 'react'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CollectionReadLayout } from '@/components/dashboard/collection-read-layout'
import {
  buildCollectionObjectUrl,
  useCollectionObjectSelection,
} from '@/lib/dashboard/use-collection-object-selection'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { ReferenceStatusBadge } from '@/components/reference-status-badge'

import {
  getReferenceAssets,
  type ReferenceAssetRow,
} from '@/app/(app)/actions'
import { loadReferenceInternalFrameSupplement } from '@/app/(app)/references/[id]/load-internal-frame-supplement'
import type { OrgDateDisplayFormat } from '@/lib/format'
import type { ReferenceInternalFrameSupplement } from '@/lib/references/reference-internal-frame-supplement'

import type { ConceptReferenceRow } from './types'
import { splitTags } from './types'
import { ReferenceDetailPane } from './reference-detail-pane'

type SortKey = 'created_at' | 'title' | 'company_name'
type StatusFilter = 'all' | ConceptReferenceRow['status'] | 'approval_pending'

function referenceRowShowsApprovalPending(ref: ConceptReferenceRow): boolean {
  if (String(ref.customer_approval_status ?? '').toLowerCase() === 'pending') return true
  return String(ref.status ?? '').toLowerCase() === 'pending'
}

function InboxRow({
  item,
  active,
  href,
}: {
  item: ConceptReferenceRow
  active: boolean
  href: string
}) {
  const tags = splitTags(item.tags)

  return (
    <Card className="gap-0 p-0">
    <Link
      href={href}
      className={cn(
        'block px-3 py-2 transition-colors',
        'hover:bg-muted/50',
        active ? 'bg-muted border-foreground/15' : 'bg-background',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 shrink-0">
            {item.company_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.company_logo_url}
                alt=""
                className="h-9 w-9 rounded-md border object-contain bg-background"
              />
            ) : (
              <div className="h-9 w-9 rounded-md border bg-muted/40" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-medium">{item.title}</div>
              {item.status === 'draft' ? (
                <span className="h-2 w-2 rounded-full bg-blue-600" />
              ) : null}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {item.status === 'anonymized' ? 'Anonymisierter Kunde' : item.company_name}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <ReferenceStatusBadge
            status={item.status}
            customerApprovalStatus={item.customer_approval_status}
          />
        </div>
      </div>

      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {item.summary ?? item.customer_challenge ?? '—'}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {tags.slice(0, 3).map((t) => (
          <Badge key={t} variant="secondary" className="rounded-md">
            {t}
          </Badge>
        ))}
        {tags.length > 3 ? (
          <Badge variant="outline" className="rounded-md">
            +{tags.length - 3}
          </Badge>
        ) : null}
      </div>
    </Link>
    </Card>
  )
}

export function InboxReferencesConceptClient({
  references,
  selectionPool,
  canEdit,
  canDelete,
  isSalesView,
  orgDateFmt,
  externalContacts,
  variant = 'standalone',
}: {
  references: ConceptReferenceRow[]
  selectionPool: ConceptReferenceRow[]
  canEdit: boolean
  canDelete: boolean
  isSalesView: boolean
  orgDateFmt: OrgDateDisplayFormat
  variant?: 'standalone' | 'embedded'
  externalContacts: {
    id: string
    company_id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    phone?: string | null
  }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inboundId = searchParams.get('id')
  const arrivedWithIdRef = useRef(Boolean(inboundId))
  const firstSelectedIdRef = useRef<string | null>(null)
  const hasLeftInitialSelectionRef = useRef(false)
  const data = useMemo(() => {
    if (!inboundId) return references
    if (references.some((row) => row.id === inboundId)) return references
    const extra = selectionPool.find((row) => row.id === inboundId)
    return extra ? [...references, extra] : references
  }, [references, selectionPool, inboundId])
  const { selectedId, selected, hrefFor, clearSelection } = useCollectionObjectSelection({
    items: data,
    autoSelect: true,
  })
  if (selectedId && firstSelectedIdRef.current === null) {
    firstSelectedIdRef.current = selectedId
  }
  if (
    selectedId &&
    firstSelectedIdRef.current &&
    selectedId !== firstSelectedIdRef.current
  ) {
    hasLeftInitialSelectionRef.current = true
  }
  const autoOpenApprovalDialog =
    searchParams.get('startApproval') === '1' ||
    searchParams.get('startApproval') === 'true'

  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }])

  const columns = useMemo<ColumnDef<ConceptReferenceRow>[]>(
    () => [
      { id: 'title', accessorKey: 'title' },
      { id: 'company_name', accessorKey: 'company_name' },
      {
        id: 'status',
        accessorKey: 'status',
        filterFn: (row, _columnId, filterValue) => {
          if (filterValue === undefined || filterValue === null || filterValue === 'all')
            return true
          if (filterValue === 'approval_pending')
            return referenceRowShowsApprovalPending(row.original)
          if (referenceRowShowsApprovalPending(row.original)) return false
          return row.original.status === filterValue
        },
      },
      { id: 'created_at', accessorKey: 'created_at' },
      {
        id: 'tags',
        accessorFn: (row) => splitTags(row.tags).join(' '),
      },
      {
        id: 'text',
        accessorFn: (row) =>
          [row.summary, row.customer_challenge, row.our_solution]
            .filter(Boolean)
            .join(' '),
      },
    ],
    [],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? '')
        .trim()
        .toLowerCase()
      if (!q) return true
      const v = [
        row.original.title,
        row.original.company_name,
        row.original.summary,
        row.original.customer_challenge,
        row.original.our_solution,
        row.original.tags,
        row.original.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return v.includes(q)
    },
  })

  const rows = table.getRowModel().rows

  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assets, setAssets] = useState<ReferenceAssetRow[]>([])
  const [supplement, setSupplement] = useState<ReferenceInternalFrameSupplement | null>(
    null,
  )
  const [supplementReady, setSupplementReady] = useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function run() {
      if (!selected) {
        setAssets([])
        setAssetsLoading(false)
        setSupplement(null)
        setSupplementReady(false)
        return
      }
      setAssetsLoading(true)
      setAssets([])
      setSupplementReady(false)
      setSupplement(null)
      try {
        const [a, extra] = await Promise.all([
          getReferenceAssets(selected.id),
          loadReferenceInternalFrameSupplement(selected.id),
        ])
        if (cancelled) return
        setAssets(a)
        setSupplement(extra)
      } finally {
        if (!cancelled) {
          setAssetsLoading(false)
          setSupplementReady(true)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [selected])

  const statusValue =
    (table.getColumn('status')?.getFilterValue() as StatusFilter | undefined) ?? 'all'
  const sortKey = (sorting[0]?.id as SortKey | undefined) ?? 'created_at'
  const sortDir = sorting[0]?.desc ? 'desc' : 'asc'

  return (
    <CollectionReadLayout
      variant={variant}
      hasSelection={Boolean(selectedId)}
      onBack={clearSelection}
      list={
        <>
          <div className="border-b p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Suchen…"
                className="h-9 min-w-[220px] flex-1"
              />

              <Select
                value={`${sortKey}:${sortDir}`}
                onValueChange={(v) => {
                  const [id, dir] = v.split(':') as [SortKey, 'asc' | 'desc']
                  setSorting([{ id, desc: dir === 'desc' }])
                }}
              >
                <SelectTrigger className="h-9" aria-label="Sortierung">
                  <SelectValue placeholder="Sortieren" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at:desc">Neueste zuerst</SelectItem>
                  <SelectItem value="created_at:asc">Älteste zuerst</SelectItem>
                  <SelectItem value="title:asc">Titel A→Z</SelectItem>
                  <SelectItem value="title:desc">Titel Z→A</SelectItem>
                  <SelectItem value="company_name:asc">Account A→Z</SelectItem>
                  <SelectItem value="company_name:desc">Account Z→A</SelectItem>
                </SelectContent>
              </Select>

              {variant === 'standalone' ? (
                <Select
                  value={statusValue}
                  onValueChange={(v) => {
                    const col = table.getColumn('status')
                    if (!col) return
                    col.setFilterValue(v === 'all' ? undefined : v)
                  }}
                >
                  <SelectTrigger className="h-9" aria-label="Status Filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="internal_only">Intern</SelectItem>
                    <SelectItem value="approval_pending">
                      Freigabe ausstehend
                    </SelectItem>
                    <SelectItem value="approved">Freigegeben</SelectItem>
                    <SelectItem value="anonymized">Anonymisiert</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div>{rows.length} Treffer</div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setGlobalFilter('')
                  setColumnFilters([])
                  setSorting([{ id: 'created_at', desc: true }])
                  router.push(
                    buildCollectionObjectUrl(pathname, searchParams, { id: null }),
                  )
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {rows.map((r) => {
                const item = r.original
                return (
                  <InboxRow
                    key={item.id}
                    item={item}
                    active={item.id === selectedId}
                    href={hrefFor(item.id)}
                  />
                )
              })}
            </div>
          </ScrollArea>
        </>
      }
      pane={
        <ReferenceDetailPane
          selectedRef={selected}
          supplement={supplement}
          supplementReady={supplementReady}
          canEdit={canEdit}
          canDelete={canDelete}
          isSalesView={isSalesView}
          orgDateFmt={orgDateFmt}
          autoOpenApprovalDialog={autoOpenApprovalDialog}
          arrivedWithId={arrivedWithIdRef.current}
          firstSelectedId={firstSelectedIdRef.current}
          hasLeftInitialSelection={hasLeftInitialSelectionRef.current}
          externalContacts={externalContacts}
          assets={assets}
          assetsLoading={assetsLoading}
          onAssetsChange={setAssets}
        />
      }
    />
  )
}

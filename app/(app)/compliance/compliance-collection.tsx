'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import type { ComplianceDocumentRow } from '@/app/(app)/settings/compliance-actions'
import {
  getComplianceDocumentAccessUrls,
  prefetchComplianceDocumentUrls,
  type ComplianceDocumentAccessUrls,
} from '@/app/(app)/settings/compliance-actions'
import { ComplianceBulkUploadDialog } from '@/app/(app)/compliance/compliance-bulk-upload-dialog'
import { ComplianceDocumentVersionsSheet } from '@/app/(app)/compliance/compliance-document-versions-sheet'
import { ComplianceUploadDialog } from '@/app/(app)/compliance/compliance-upload-dialog'
import { ComplianceCollectionToolbar } from '@/app/(app)/compliance/compliance-collection-toolbar'
import { ComplianceReadPane } from '@/app/(app)/compliance/compliance-read-pane'
import {
  getComplianceSortValue,
  loadComplianceColumnOrderFromStorage,
  renderComplianceColumnCell,
  renderComplianceColumnHeader,
  type ComplianceColumnKey,
} from '@/app/(app)/compliance/compliance-table-column-renders'
import { CollectionReadLayout } from '@/components/dashboard/collection-read-layout'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useRole } from '@/hooks/useRole'
import { filterComplianceDocumentsForTable } from '@/lib/compliance/compliance-table-rows'
import { COPY } from '@/lib/copy'
import {
  buildCollectionObjectUrl,
  useCollectionObjectSelection,
} from '@/lib/dashboard/use-collection-object-selection'
import { cn } from '@/lib/utils'

export function ComplianceCollection({
  documents,
}: {
  documents: ComplianceDocumentRow[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { can } = useRole()
  const canManage = can('manage_compliance_documents')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [uploadDocumentType, setUploadDocumentType] = useState<string | undefined>()
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionsType, setVersionsType] = useState<string | null>(null)
  const [versionsFocusId, setVersionsFocusId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<ComplianceColumnKey | null>('updated_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [columnOrder, setColumnOrder] = useState<ComplianceColumnKey[]>(() =>
    loadComplianceColumnOrderFromStorage(),
  )
  const urlCacheRef = useRef<Map<string, ComplianceDocumentAccessUrls>>(new Map())

  useEffect(() => {
    const ids = documents.filter((doc) => doc.file_storage_path).map((doc) => doc.id)
    if (ids.length === 0) return
    void prefetchComplianceDocumentUrls(ids).then((result) => {
      if (!result.success) return
      for (const [id, urls] of Object.entries(result.urlsById)) {
        urlCacheRef.current.set(id, urls)
      }
    })
  }, [documents])

  const filtered = useMemo(() => {
    let rows = filterComplianceDocumentsForTable({
      documents,
      search,
      showExpired: true,
    })
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const va = getComplianceSortValue(a, sortKey)
        const vb = getComplianceSortValue(b, sortKey)
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va
        }
        const cmp = String(va).localeCompare(String(vb), 'de')
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [documents, search, sortKey, sortDir])

  const { selectedId, selected, clearSelection } = useCollectionObjectSelection({
    items: filtered,
  })

  function hrefForRead(id: string) {
    return buildCollectionObjectUrl(pathname, searchParams, {
      view: 'lesen',
      id,
    })
  }

  function moveColumnOrder(from: string, to: string) {
    if (from === to) return
    setColumnOrder((prev) => {
      const next = prev.filter((key) => key !== from)
      const insertAt = next.indexOf(to as ComplianceColumnKey)
      if (insertAt === -1) return prev
      next.splice(insertAt, 0, from as ComplianceColumnKey)
      return [...next]
    })
  }

  function handleSort(column: ComplianceColumnKey) {
    setSortKey((prev) => {
      if (prev === column) {
        setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return column
    })
  }

  async function handleOpenPdf(doc: ComplianceDocumentRow) {
    if (!doc.file_storage_path) {
      toast.error(COPY.compliance.previewUnavailable)
      return
    }
    const result = await getComplianceDocumentAccessUrls(doc.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    window.open(result.urls.viewUrl, '_blank', 'noopener,noreferrer')
  }

  const headerCtx = {
    dragOverColumn,
    setDragOverColumn,
    moveColumnOrder,
    sortKey,
    sortDir,
    handleSort,
  }

  const cellCtx = {
    onOpenPdf: (doc: ComplianceDocumentRow) => void handleOpenPdf(doc),
  }

  const table = (
    <div className="min-h-0 flex-1 overflow-auto p-2">
      <Table className="min-w-[720px] w-full">
        <TableHeader>
          <TableRow>
            {columnOrder.map((column) => (
              <Fragment key={column}>{renderComplianceColumnHeader(column, headerCtx)}</Fragment>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnOrder.length}
                className="h-24 text-center text-muted-foreground"
              >
                {COPY.table.empty}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((doc) => (
              <TableRow
                key={doc.id}
                className={cn(
                  'cursor-pointer hover:bg-accent/35',
                  doc.id === selectedId && 'bg-accent/25',
                )}
                onClick={(event) => {
                  const target = event.target as HTMLElement
                  if (target.closest('[data-compliance-skip-row-click]')) return
                  router.push(hrefForRead(doc.id), { scroll: false })
                }}
              >
                {columnOrder.map((column) => (
                  <Fragment key={column}>{renderComplianceColumnCell(column, doc, cellCtx)}</Fragment>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-5">
        <ComplianceCollectionToolbar
          search={search}
          onSearchChange={setSearch}
          canManage={canManage}
          onUpload={() => {
            setUploadDocumentType(undefined)
            setUploadOpen(true)
          }}
          onUploadBulk={() => setBulkUploadOpen(true)}
        />
        <CollectionReadLayout
          hasSelection={Boolean(selectedId)}
          onBack={() => {
            router.push(
              buildCollectionObjectUrl(pathname, searchParams, {
                view: null,
                id: null,
              }),
            )
            clearSelection()
          }}
          list={table}
          pane={
            <ComplianceReadPane
              document={selected}
              canManage={canManage}
              onOpenNewVersion={() => {
                if (!selected) return
                setUploadDocumentType(selected.document_type)
                setUploadOpen(true)
                setVersionsType(selected.document_type)
                setVersionsFocusId(selected.id)
                setVersionsOpen(true)
              }}
            />
          }
        />
      </div>
      <ComplianceUploadDialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open)
          if (!open) setUploadDocumentType(undefined)
        }}
        defaultDocumentType={uploadDocumentType}
      />
      <ComplianceBulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
      />
      <ComplianceDocumentVersionsSheet
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        documentType={versionsType}
        focusDocumentId={versionsFocusId}
        documents={documents}
        isAdmin={canManage}
        urlCacheRef={urlCacheRef}
      />
    </TooltipProvider>
  )
}

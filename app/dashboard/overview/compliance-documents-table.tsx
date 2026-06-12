'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { ComplianceDocumentRow } from '@/app/dashboard/settings/compliance-actions'
import {
  getComplianceDocumentAccessUrls,
  prefetchComplianceDocumentUrls,
  type ComplianceDocumentAccessUrls,
} from '@/app/dashboard/settings/compliance-actions'
import { BulkDeleteComplianceDocumentsDialog } from '@/app/dashboard/overview/bulk-delete-compliance-documents-dialog'
import { ComplianceDocumentVersionsSheet } from '@/app/dashboard/overview/compliance-document-versions-sheet'
import {
  COMPLIANCE_COLUMN_KEYS,
  getComplianceSortValue,
  loadComplianceColumnOrderFromStorage,
  renderComplianceActionsCell,
  renderComplianceColumnCell,
  renderComplianceColumnHeader,
  type ComplianceColumnKey,
} from '@/app/dashboard/overview/compliance-table-column-renders'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableRowCheckbox } from '@/components/table/table-row-checkbox'
import {
  filterComplianceDocumentsForTable,
  groupComplianceDocumentsForTable,
} from '@/lib/compliance/compliance-table-rows'
import { isComplianceDocumentExpired } from '@/lib/compliance/expiry'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { Cancel01Icon, FileDownIcon } from '@hugeicons/core-free-icons'

const COMPLIANCE_COLUMN_ORDER_STORAGE_KEY = 'compliance-documents-column-order-v2'

type Props = {
  documents: ComplianceDocumentRow[]
  search: string
  showExpired: boolean
  isAdmin: boolean
  onUploadClick: () => void
}

export function ComplianceDocumentsTable({
  documents,
  search,
  showExpired,
  isAdmin,
  onUploadClick,
}: Props) {
  const router = useRouter()
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const urlCacheRef = useRef<Map<string, ComplianceDocumentAccessUrls>>(new Map())
  const prefetchGenRef = useRef(0)
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [columnOrder, setColumnOrder] = useState<ComplianceColumnKey[]>(() =>
    loadComplianceColumnOrderFromStorage()
  )
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<ComplianceColumnKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [versionsSheetOpen, setVersionsSheetOpen] = useState(false)
  const [versionsSheetType, setVersionsSheetType] = useState<string | null>(null)
  const [versionsSheetFocusId, setVersionsSheetFocusId] = useState<string | null>(null)
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const ids = documents.filter((d) => d.file_storage_path).map((d) => d.id)
    if (ids.length === 0) return

    const generation = ++prefetchGenRef.current
    void prefetchComplianceDocumentUrls(ids).then((result) => {
      if (generation !== prefetchGenRef.current || !result.success) return
      for (const [id, urls] of Object.entries(result.urlsById)) {
        urlCacheRef.current.set(id, urls)
      }
    })
  }, [documents])

  useEffect(() => {
    const loaded = loadComplianceColumnOrderFromStorage()
    setColumnOrder(loaded)
    if (typeof window !== 'undefined' && loaded.length !== COMPLIANCE_COLUMN_KEYS.length) {
      try {
        localStorage.setItem(
          COMPLIANCE_COLUMN_ORDER_STORAGE_KEY,
          JSON.stringify([...COMPLIANCE_COLUMN_KEYS])
        )
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(COMPLIANCE_COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder))
    } catch {
      /* ignore */
    }
  }, [columnOrder])

  const moveColumnOrder = useCallback((from: string, to: string) => {
    if (from === to) return
    setColumnOrder((prev) => {
      const next = prev.filter((k) => k !== from)
      const insertAt = next.indexOf(to as ComplianceColumnKey)
      if (insertAt === -1) return prev
      next.splice(insertAt, 0, from as ComplianceColumnKey)
      return [...next]
    })
  }, [])

  const handleSort = useCallback((column: ComplianceColumnKey) => {
    setSortKey((prev) => {
      if (prev === column) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return column
    })
  }, [])

  const filtered = useMemo(() => {
    let rows = filterComplianceDocumentsForTable({
      documents,
      search,
      showExpired,
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
  }, [documents, search, showExpired, sortKey, sortDir])

  const filteredIdSet = useMemo(() => new Set(filtered.map((d) => d.id)), [filtered])

  const selectedDocs = useMemo(
    () => documents.filter((doc) => selectedIds.has(doc.id)),
    [documents, selectedIds]
  )

  const selectedFilteredCount = useMemo(
    () => filtered.filter((doc) => selectedIds.has(doc.id)).length,
    [filtered, selectedIds]
  )

  const hiddenExpiredCount = useMemo(
    () =>
      groupComplianceDocumentsForTable(documents).filter((doc) =>
        isComplianceDocumentExpired(doc.valid_until)
      ).length,
    [documents]
  )

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((doc) => selectedIds.has(doc.id))

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => filteredIdSet.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [filteredIdSet])

  useEffect(() => {
    const el = selectAllCheckboxRef.current
    if (!el) return
    el.indeterminate =
      selectedFilteredCount > 0 && selectedFilteredCount < filtered.length
  }, [selectedFilteredCount, filtered.length])

  function openVersionsSheet(doc: ComplianceDocumentRow) {
    setVersionsSheetType(doc.document_type)
    setVersionsSheetFocusId(doc.id)
    setVersionsSheetOpen(true)
  }

  function handleRowClick(event: React.MouseEvent, doc: ComplianceDocumentRow) {
    const target = event.target as HTMLElement
    if (target.closest('[data-compliance-skip-row-click]')) return
    openVersionsSheet(doc)
  }

  function toggleSelection(docId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((doc) => next.delete(doc.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((doc) => next.add(doc.id))
        return next
      })
    }
  }

  function triggerFileDownload(url: string) {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.rel = 'noopener'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  async function resolveAccessUrls(
    doc: ComplianceDocumentRow
  ): Promise<ComplianceDocumentAccessUrls | null> {
    const cached = urlCacheRef.current.get(doc.id)
    if (cached) return cached

    setResolvingId(doc.id)
    try {
      const result = await getComplianceDocumentAccessUrls(doc.id)
      if (!result.success) {
        toast.error(result.error)
        return null
      }
      urlCacheRef.current.set(doc.id, result.urls)
      return result.urls
    } finally {
      setResolvingId(null)
    }
  }

  async function handleOpenPdf(doc: ComplianceDocumentRow) {
    if (!doc.file_storage_path) {
      toast.error('Für dieses Dokument ist keine Datei hinterlegt.')
      return
    }
    const cached = urlCacheRef.current.get(doc.id)
    if (cached) {
      window.open(cached.viewUrl, '_blank', 'noopener,noreferrer')
      return
    }
    const urls = await resolveAccessUrls(doc)
    if (!urls) return
    window.open(urls.viewUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleDownload(doc: ComplianceDocumentRow) {
    if (!doc.file_storage_path) {
      toast.error('Für dieses Dokument ist keine Datei hinterlegt.')
      return
    }
    const cached = urlCacheRef.current.get(doc.id)
    if (cached) {
      triggerFileDownload(cached.downloadUrl)
      return
    }
    const urls = await resolveAccessUrls(doc)
    if (!urls) return
    triggerFileDownload(urls.downloadUrl)
  }

  async function handleBulkDownload() {
    const withFile = selectedDocs.filter((doc) => doc.file_storage_path)
    if (withFile.length === 0) {
      toast.error('Keine der ausgewählten Zertifikate hat eine Datei zum Herunterladen.')
      return
    }
    setBulkDownloading(true)
    let opened = 0
    for (const doc of withFile) {
      const cached = urlCacheRef.current.get(doc.id)
      if (cached) {
        triggerFileDownload(cached.downloadUrl)
        opened++
        continue
      }
      const result = await getComplianceDocumentAccessUrls(doc.id)
      if (result.success) {
        urlCacheRef.current.set(doc.id, result.urls)
        triggerFileDownload(result.urls.downloadUrl)
        opened++
      }
    }
    setBulkDownloading(false)
    if (opened === 0) {
      toast.error('Download fehlgeschlagen.')
      return
    }
    toast.success(
      `${opened} Zertifikat${opened !== 1 ? 'e' : ''} werden heruntergeladen.`
    )
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
    resolvingId,
    onOpenPdf: (doc: ComplianceDocumentRow) => void handleOpenPdf(doc),
    onDownload: (doc: ComplianceDocumentRow) => void handleDownload(doc),
  }

  const selectedCount = selectedIds.size
  const selectedLabel = `${selectedCount} Zertifikat${selectedCount === 1 ? '' : 'e'}`

  return (
    <>
      {selectedCount > 0 ? (
        <div className="fixed bottom-6 left-1/2 z-50 w-[min(720px,calc(100vw-24px))] -translate-x-1/2">
          <div className="flex items-center justify-between rounded-lg border bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75">
            <div className="text-sm text-muted-foreground">{selectedCount} ausgewählt</div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkDownloading}>
                  Aktionen
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[260px]">
                <DropdownMenuLabel>Bulk-Aktionen</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={bulkDownloading}
                  onSelect={(e: Event) => {
                    e.preventDefault()
                    void handleBulkDownload()
                  }}
                >
                  <AppIcon icon={FileDownIcon} size={16} className="mr-2" />
                  {selectedLabel} herunterladen
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e: Event) => {
                      e.preventDefault()
                      setBulkDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="mr-2 size-4" aria-hidden />
                    Ausgewählte löschen
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSelectedIds(new Set())}>
                  <AppIcon icon={Cancel01Icon} size={16} className="mr-2 text-muted-foreground" />
                  Auswahl aufheben
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : null}

      <ComplianceDocumentVersionsSheet
        open={versionsSheetOpen}
        onOpenChange={setVersionsSheetOpen}
        documentType={versionsSheetType}
        focusDocumentId={versionsSheetFocusId}
        documents={documents}
        isAdmin={isAdmin}
        urlCacheRef={urlCacheRef}
      />

      {isAdmin ? (
        <BulkDeleteComplianceDocumentsDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          ids={Array.from(selectedIds)}
          loading={bulkDeleteLoading}
          onLoadingChange={setBulkDeleteLoading}
          onSuccess={() => {
            setSelectedIds(new Set())
            setBulkDeleteOpen(false)
            router.refresh()
          }}
        />
      ) : null}

      <div className="min-w-0 overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm shadow-slate-900/5">
        {!showExpired && hiddenExpiredCount > 0 ? (
          <p className="border-b border-border/70 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
            {hiddenExpiredCount} abgelaufene Zertifikat{hiddenExpiredCount !== 1 ? 'e' : ''}{' '}
            ausgeblendet — Auge-Symbol in der Toolbar zum Anzeigen.
          </p>
        ) : null}
        <Table className="min-w-[800px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 w-[32px] align-middle p-2 pr-0 text-xs font-semibold text-muted-foreground">
                <TableRowCheckbox
                  ref={selectAllCheckboxRef}
                  rowHeight={10}
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  aria-label="Alle auswählen"
                  disabled={filtered.length === 0}
                />
              </TableHead>
              {columnOrder.map((column) => (
                <React.Fragment key={column}>
                  {renderComplianceColumnHeader(column, headerCtx)}
                </React.Fragment>
              ))}
              <TableHead className="h-9 w-[88px] min-w-[88px] p-2 text-right text-xs font-semibold text-muted-foreground">
                <span className="sr-only">Aktionen</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnOrder.length + 2}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-3 py-2">
                    <p>
                      {documents.length === 0
                        ? 'Noch keine Zertifikate hinterlegt.'
                        : !showExpired && hiddenExpiredCount > 0
                          ? 'Keine aktiven Zertifikate — abgelaufene über das Auge-Symbol einblenden.'
                          : 'Keine Treffer für deine Suche.'}
                    </p>
                    {documents.length === 0 && isAdmin ? (
                      <Button type="button" onClick={onUploadClick}>
                        Erstes Zertifikat hochladen
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((doc) => {
                const expired = isComplianceDocumentExpired(doc.valid_until)
                return (
                  <TableRow
                    key={doc.id}
                    className={cn(
                      expired ? 'bg-muted/30 opacity-80' : 'group hover:bg-accent/35',
                      selectedIds.has(doc.id) && 'bg-accent/25',
                      'cursor-pointer'
                    )}
                    onClick={(event) => handleRowClick(event, doc)}
                  >
                    <TableCell
                      className="w-[32px] align-middle p-2 pr-0"
                      data-compliance-skip-row-click
                      onClick={(event) => event.stopPropagation()}
                    >
                      <TableRowCheckbox
                        checked={selectedIds.has(doc.id)}
                        onChange={() => toggleSelection(doc.id)}
                        aria-label={`${doc.title} auswählen`}
                      />
                    </TableCell>
                    {columnOrder.map((column) => (
                      <React.Fragment key={column}>
                        {renderComplianceColumnCell(column, doc, cellCtx)}
                      </React.Fragment>
                    ))}
                    {renderComplianceActionsCell(doc, cellCtx)}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

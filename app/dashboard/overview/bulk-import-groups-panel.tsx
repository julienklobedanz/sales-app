'use client'

import type { DragEvent } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Cancel01Icon, FileText, PencilEdit01Icon } from '@hugeicons/core-free-icons'

import { AccountsToolbarTooltip } from '@/app/dashboard/accounts/components/accounts-toolbar-tooltip'
import { AppIcon } from '@/lib/icons'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { isSuspiciousBulkImportProjectName } from '@/lib/references/bulk-import-preview-utils'
import { cn } from '@/lib/utils'

import {
  BULK_IMPORT_HEADER_CLASS,
  BULK_IMPORT_ROW_GRID_CLASS,
  type BulkImportGroupItem,
} from './bulk-import-types'

export function BulkImportGroupsPanel({
  groups,
  loading,
  selectedGroupIds,
  editingCompanyId,
  companyDraft,
  setCompanyDraft,
  dragOverGroupId,
  setDragOverGroupId,
  draggingFileKey,
  setDraggingFileKey,
  toggleGroupSelection,
  startCompanyEdit,
  commitCompanyEdit,
  cancelCompanyEdit,
  isGroupPreviewPending,
  setGroupName,
  removeFile,
  fileChipKey,
  handleFileChipDragStart,
  handleDocumentsDragOver,
  handleDocumentsDrop,
}: {
  groups: BulkImportGroupItem[]
  loading: boolean
  selectedGroupIds: Set<string>
  editingCompanyId: string | null
  companyDraft: string
  setCompanyDraft: (value: string) => void
  dragOverGroupId: string | null
  setDragOverGroupId: (
    value: string | null | ((prev: string | null) => string | null),
  ) => void
  draggingFileKey: string | null
  setDraggingFileKey: (value: string | null) => void
  toggleGroupSelection: (groupId: string, checked: boolean) => void
  startCompanyEdit: (group: BulkImportGroupItem) => void
  commitCompanyEdit: (groupId: string) => void
  cancelCompanyEdit: () => void
  isGroupPreviewPending: (group: BulkImportGroupItem) => boolean
  setGroupName: (groupId: string, projectName: string) => void
  removeFile: (groupId: string, fileIndex: number) => void
  fileChipKey: (groupId: string, file: File) => string
  handleFileChipDragStart: (
    event: DragEvent<HTMLDivElement>,
    groupId: string,
    fileIndex: number,
    chipKey: string,
  ) => void
  handleDocumentsDragOver: (event: DragEvent<HTMLDivElement>, groupId: string) => void
  handleDocumentsDrop: (event: DragEvent<HTMLDivElement>, toGroupId: string) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex shrink-0 gap-3 border-b border-border bg-card px-3 py-2">
        <div className="size-4 shrink-0" aria-hidden />
        <div className={cn(BULK_IMPORT_ROW_GRID_CLASS, BULK_IMPORT_HEADER_CLASS)}>
          <span>Kunde</span>
          <span>Referenztitel</span>
          <span>Dokumente</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-card">
        {groups.map((group) => {
          const previewPending = isGroupPreviewPending(group)
          const suspiciousTitle = isSuspiciousBulkImportProjectName(group.projectName)
          const isEditingCompany = editingCompanyId === group.id

          return (
            <div
              key={group.id}
              className="flex items-center gap-3 border-b border-border bg-card px-3 py-2.5 last:border-b-0"
            >
              <Checkbox
                className="self-center"
                checked={selectedGroupIds.has(group.id)}
                disabled={loading}
                onCheckedChange={(checked) =>
                  toggleGroupSelection(group.id, checked === true)
                }
                aria-label={`${group.projectName || 'Referenz'} auswählen`}
              />

              <div className={BULK_IMPORT_ROW_GRID_CLASS}>
                <div className="flex min-w-0 items-center gap-1.5">
                  {isEditingCompany ? (
                    <Input
                      value={companyDraft}
                      onChange={(e) => setCompanyDraft(e.target.value)}
                      onBlur={() => commitCompanyEdit(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitCompanyEdit(group.id)
                        if (e.key === 'Escape') cancelCompanyEdit()
                      }}
                      disabled={loading}
                      autoFocus
                      className="h-7 min-w-0 flex-1 text-sm"
                    />
                  ) : (
                    <>
                      <span
                        className={cn(
                          'min-w-0 truncate text-sm font-medium',
                          group.companyName ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {group.companyName?.trim() || '—'}
                      </span>
                      <AccountsToolbarTooltip label="Kunde bearbeiten">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => startCompanyEdit(group)}
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Kunde bearbeiten"
                        >
                          <AppIcon icon={PencilEdit01Icon} size={14} />
                        </button>
                      </AccountsToolbarTooltip>
                    </>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <Input
                    value={group.projectName}
                    onChange={(e) => setGroupName(group.id, e.target.value)}
                    disabled={loading}
                    className="h-8 min-w-0 flex-1 text-sm"
                    placeholder="Referenztitel"
                    aria-label="Referenztitel"
                  />
                  {previewPending ? (
                    <RefreshCw
                      className="size-4 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                  ) : null}
                  {!previewPending && suspiciousTitle ? (
                    <AccountsToolbarTooltip label="Projektname prüfen — evtl. Zeitraum statt Titel erkannt">
                      <span className="inline-flex shrink-0 text-amber-600">
                        <AlertTriangle className="size-4" aria-hidden />
                      </span>
                    </AccountsToolbarTooltip>
                  ) : null}
                </div>

                <div
                  className={cn(
                    'flex min-h-9 min-w-0 flex-wrap gap-1.5 rounded-md transition-colors lg:justify-end',
                    dragOverGroupId === group.id &&
                      'bg-primary/10 ring-1 ring-inset ring-primary/40',
                  )}
                  onDragOver={(event) => handleDocumentsDragOver(event, group.id)}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setDragOverGroupId((prev) => (prev === group.id ? null : prev))
                    }
                  }}
                  onDrop={(event) => handleDocumentsDrop(event, group.id)}
                >
                  {group.files.map((file, fileIndex) => {
                    const chipKey = fileChipKey(group.id, file)
                    return (
                      <div
                        key={chipKey}
                        draggable={!loading}
                        onDragStart={(event) =>
                          handleFileChipDragStart(event, group.id, fileIndex, chipKey)
                        }
                        onDragEnd={() => {
                          setDraggingFileKey(null)
                          setDragOverGroupId(null)
                        }}
                        className={cn(
                          'flex max-w-full cursor-grab items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs shadow-sm active:cursor-grabbing',
                          draggingFileKey === chipKey && 'opacity-50',
                        )}
                      >
                        <AppIcon
                          icon={FileText}
                          size={12}
                          className="shrink-0 text-muted-foreground"
                        />
                        <span className="max-w-[100px] truncate sm:max-w-[120px]">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => removeFile(group.id, fileIndex)}
                          onMouseDown={(event) => event.stopPropagation()}
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`${file.name} entfernen`}
                        >
                          <AppIcon icon={Cancel01Icon} size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

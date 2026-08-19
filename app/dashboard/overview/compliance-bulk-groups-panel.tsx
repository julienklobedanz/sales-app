'use client'

import { RefreshCw } from 'lucide-react'
import { Cancel01Icon, FileText } from '@hugeicons/core-free-icons'
import type { DragEvent } from 'react'

import { ComplianceDocumentTypeCombobox } from '@/app/dashboard/overview/compliance-document-type-combobox'
import { AppIcon } from '@/lib/icons'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { ComplianceDocumentTypeOption } from '@/lib/compliance/document-types'
import { cn } from '@/lib/utils'

import {
  HEADER_CLASS,
  ROW_GRID_CLASS,
  type BulkFileItem,
  type BulkGroup,
} from './compliance-bulk-upload-types'

export function ComplianceBulkGroupsPanel({
  groups,
  typeOptions,
  setTypeOptions,
  selectedGroupIds,
  dragOverGroupId,
  setDragOverGroupId,
  draggingFileKey,
  setDraggingFileKey,
  saving,
  typesLoading,
  toggleGroupSelection,
  updateGroupTitle,
  handleDocumentTypeChange,
  removeFile,
  fileChipKey,
  handleFileChipDragStart,
  handleDocumentsDrop,
  onManageTypesClick,
}: {
  groups: BulkGroup[]
  typeOptions: ComplianceDocumentTypeOption[]
  setTypeOptions: (options: ComplianceDocumentTypeOption[]) => void
  selectedGroupIds: Set<string>
  dragOverGroupId: string | null
  setDragOverGroupId: (
    value: string | null | ((prev: string | null) => string | null),
  ) => void
  draggingFileKey: string | null
  setDraggingFileKey: (value: string | null) => void
  saving: boolean
  typesLoading: boolean
  toggleGroupSelection: (groupId: string, checked: boolean) => void
  updateGroupTitle: (groupId: string, title: string) => void
  handleDocumentTypeChange: (groupId: string, slug: string) => void
  removeFile: (groupId: string, fileIndex: number) => void
  fileChipKey: (groupId: string, item: BulkFileItem) => string
  handleFileChipDragStart: (
    event: DragEvent<HTMLDivElement>,
    groupId: string,
    fileIndex: number,
    chipKey: string,
  ) => void
  handleDocumentsDrop: (event: DragEvent<HTMLDivElement>, toGroupId: string) => void
  onManageTypesClick: () => void
}) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
      <div className="flex shrink-0 gap-3 border-b border-border bg-card px-3 py-2">
        <div className="size-4 shrink-0" aria-hidden />
        <div className={cn(ROW_GRID_CLASS, HEADER_CLASS)}>
          <span>Zertifikatstyp</span>
          <span>Titel</span>
          <span>Dokumente</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-card">
        {groups.map((group) => {
          const previewPending = group.files.some((f) => f.extracting)
          return (
            <div
              key={group.id}
              className="flex items-center gap-3 border-b border-border bg-card px-3 py-2.5 last:border-b-0"
            >
              <Checkbox
                className="self-center"
                checked={selectedGroupIds.has(group.id)}
                disabled={saving}
                onCheckedChange={(checked) =>
                  toggleGroupSelection(group.id, checked === true)
                }
                aria-label={`${group.title || 'Zertifikat'} auswählen`}
              />

              <div className={ROW_GRID_CLASS}>
                <div className="min-w-0">
                  <ComplianceDocumentTypeCombobox
                    options={typeOptions}
                    value={group.documentType}
                    onValueChange={(slug) => handleDocumentTypeChange(group.id, slug)}
                    onOptionsChange={setTypeOptions}
                    disabled={saving || previewPending || typesLoading}
                    onManageTypesClick={onManageTypesClick}
                  />
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <Input
                    value={group.title}
                    onChange={(e) => updateGroupTitle(group.id, e.target.value)}
                    disabled={saving || previewPending}
                    className="h-8 min-w-0 flex-1 text-sm"
                    placeholder="Titel"
                    aria-label="Zertifikatstitel"
                  />
                  {previewPending ? (
                    <RefreshCw
                      className="size-4 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                  ) : null}
                </div>

                <div
                  className={cn(
                    'flex min-h-9 min-w-0 flex-wrap gap-1.5 rounded-md transition-colors lg:justify-end',
                    dragOverGroupId === group.id &&
                      'bg-primary/10 ring-1 ring-inset ring-primary/40',
                  )}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    event.dataTransfer.dropEffect = 'move'
                    setDragOverGroupId(group.id)
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setDragOverGroupId((prev) => (prev === group.id ? null : prev))
                    }
                  }}
                  onDrop={(event) => handleDocumentsDrop(event, group.id)}
                >
                  {group.files.map((item, fileIndex) => {
                    const chipKey = fileChipKey(group.id, item)
                    return (
                      <div
                        key={chipKey}
                        draggable={!saving}
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
                          {item.file.name}
                        </span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => removeFile(group.id, fileIndex)}
                          onMouseDown={(event) => event.stopPropagation()}
                          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`${item.file.name} entfernen`}
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
    </Card>
  )
}

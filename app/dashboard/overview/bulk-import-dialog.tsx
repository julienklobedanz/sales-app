'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BULK_IMPORT_MAX_FILES } from '@/lib/references/bulk-import-limits'
import { cn } from '@/lib/utils'

import { BulkImportDropzone } from './bulk-import-dropzone'
import { BulkImportFooter } from './bulk-import-footer'
import { BulkImportGroupsPanel } from './bulk-import-groups-panel'
import {
  BulkImportReviewDialog,
} from './bulk-import-review-dialog'
import { BULK_IMPORT_DIALOG_CLASS, type BulkImportGroupItem } from './bulk-import-types'
import { useBulkImportDialog } from './use-bulk-import-dialog'

export type { BulkImportGroupItem }

export function BulkImportDialog({
  open,
  onOpenChange,
  loading,
  onLoadingChange,
  groups,
  setGroups,
  dropRef,
  addFiles,
  removeFile,
  moveFile,
  setGroupName,
  setCompanyName,
  mergeSelectedGroups,
  previewPendingFiles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  onLoadingChange?: (loading: boolean) => void
  groups: BulkImportGroupItem[]
  setGroups: Dispatch<SetStateAction<BulkImportGroupItem[]>>
  dropRef: RefObject<HTMLInputElement | null>
  addFiles: (files: File[]) => void
  removeFile: (groupId: string, fileIndex: number) => void
  moveFile: (fromGroupId: string, fileIndex: number, toGroupId: string) => void
  setGroupName: (groupId: string, projectName: string) => void
  setCompanyName: (groupId: string, companyName: string) => void
  mergeSelectedGroups: (groupIds: string[]) => void
  previewPendingFiles: Set<File>
}) {
  const state = useBulkImportDialog({
    open,
    onOpenChange,
    loading,
    onLoadingChange,
    groups,
    setGroups,
    moveFile,
    setCompanyName,
    mergeSelectedGroups,
    previewPendingFiles,
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={BULK_IMPORT_DIALOG_CLASS} showCloseButton={!loading}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4 md:px-10 md:py-5">
            <DialogHeader className="shrink-0 space-y-1 text-left">
              <DialogTitle>Referenzen importieren</DialogTitle>
              <DialogDescription>
                Lege bis zu {BULK_IMPORT_MAX_FILES} Dateien ab. Alle Uploads werden
                automatisch Kunden zugeordnet.
              </DialogDescription>
            </DialogHeader>

            <div
              className={cn(
                'min-h-0 flex-1 pt-3',
                state.hasFiles ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
              )}
            >
              <input
                ref={dropRef}
                type="file"
                multiple
                accept=".pdf,.pptx,.ppt,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files) : []
                  addFiles(list)
                  e.target.value = ''
                }}
              />

              {!state.hasFiles ? (
                <BulkImportDropzone
                  compact={false}
                  loading={loading}
                  dropRef={dropRef}
                  onAddFiles={addFiles}
                />
              ) : (
                <BulkImportGroupsPanel
                  groups={groups}
                  loading={loading}
                  selectedGroupIds={state.selectedGroupIds}
                  editingCompanyId={state.editingCompanyId}
                  companyDraft={state.companyDraft}
                  setCompanyDraft={state.setCompanyDraft}
                  dragOverGroupId={state.dragOverGroupId}
                  setDragOverGroupId={state.setDragOverGroupId}
                  draggingFileKey={state.draggingFileKey}
                  setDraggingFileKey={state.setDraggingFileKey}
                  toggleGroupSelection={state.toggleGroupSelection}
                  startCompanyEdit={state.startCompanyEdit}
                  commitCompanyEdit={state.commitCompanyEdit}
                  cancelCompanyEdit={state.cancelCompanyEdit}
                  isGroupPreviewPending={state.isGroupPreviewPending}
                  setGroupName={setGroupName}
                  removeFile={removeFile}
                  fileChipKey={state.fileChipKey}
                  handleFileChipDragStart={state.handleFileChipDragStart}
                  handleDocumentsDragOver={state.handleDocumentsDragOver}
                  handleDocumentsDrop={state.handleDocumentsDrop}
                />
              )}
            </div>

            <BulkImportFooter
              hasFiles={state.hasFiles}
              totalFiles={state.totalFiles}
              groupsCount={groups.length}
              loading={loading}
              canMergeSelected={state.canMergeSelected}
              extractionProgress={state.extractionProgress}
              dropRef={dropRef}
              onAddFiles={addFiles}
              onMergeSelected={state.mergeSelectedAndClear}
              onCancel={() => onOpenChange(false)}
              onSubmit={() => void state.handleImport()}
            />
          </div>
        </DialogContent>
      </Dialog>
      <BulkImportReviewDialog
        open={state.reviewOpen}
        onOpenChange={state.setReviewOpen}
        items={state.reviewItems}
      />
    </>
  )
}

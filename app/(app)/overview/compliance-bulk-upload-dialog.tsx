'use client'

import { ComplianceDocumentTypesDialog } from '@/app/(app)/overview/compliance-document-types-dialog'
import { ComplianceMultiPdfDropzone } from '@/app/(app)/overview/compliance-multi-pdf-dropzone'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import { ComplianceBulkGroupsPanel } from './compliance-bulk-groups-panel'
import { ComplianceBulkUploadFooter } from './compliance-bulk-upload-footer'
import { DIALOG_CLASS } from './compliance-bulk-upload-types'
import { useComplianceBulkUpload } from './use-compliance-bulk-upload'

export function ComplianceBulkUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const state = useComplianceBulkUpload(onOpenChange)

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) void state.loadTypes()
          else state.reset()
          onOpenChange(next)
        }}
      >
        <DialogContent className={DIALOG_CLASS} showCloseButton={!state.saving}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4 md:px-10 md:py-5">
            <DialogHeader className="shrink-0 space-y-1 text-left">
              <DialogTitle>Zertifikate importieren</DialogTitle>
              <DialogDescription>
                Lege PDFs ab. Dateien werden automatisch nach Zertifikatstyp gruppiert.
              </DialogDescription>
            </DialogHeader>

            <div
              className={cn(
                'min-h-0 flex-1 pt-3',
                state.hasFiles ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
              )}
            >
              {!state.hasFiles ? (
                <ComplianceMultiPdfDropzone
                  onFilesSelected={state.addFiles}
                  disabled={state.saving || state.typesLoading}
                />
              ) : (
                <ComplianceBulkGroupsPanel
                  groups={state.groups}
                  typeOptions={state.typeOptions}
                  setTypeOptions={state.setTypeOptions}
                  selectedGroupIds={state.selectedGroupIds}
                  dragOverGroupId={state.dragOverGroupId}
                  setDragOverGroupId={state.setDragOverGroupId}
                  draggingFileKey={state.draggingFileKey}
                  setDraggingFileKey={state.setDraggingFileKey}
                  saving={state.saving}
                  typesLoading={state.typesLoading}
                  toggleGroupSelection={state.toggleGroupSelection}
                  updateGroupTitle={state.updateGroupTitle}
                  handleDocumentTypeChange={state.handleDocumentTypeChange}
                  removeFile={state.removeFile}
                  fileChipKey={state.fileChipKey}
                  handleFileChipDragStart={state.handleFileChipDragStart}
                  handleDocumentsDrop={state.handleDocumentsDrop}
                  onManageTypesClick={() => state.setTypesDialogOpen(true)}
                />
              )}
            </div>

            <ComplianceBulkUploadFooter
              hasFiles={state.hasFiles}
              totalFiles={state.totalFiles}
              groupsCount={state.groups.length}
              saving={state.saving}
              typesLoading={state.typesLoading}
              anyExtracting={state.anyExtracting}
              canMergeSelected={state.canMergeSelected}
              onAddFiles={state.addFiles}
              onMergeSelected={state.mergeSelectedAndClear}
              onCancel={() => onOpenChange(false)}
              onSubmit={() => void state.handleSubmit()}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ComplianceDocumentTypesDialog
        open={state.typesDialogOpen}
        onOpenChange={state.setTypesDialogOpen}
        onTypesChange={state.setTypeOptions}
      />
    </>
  )
}

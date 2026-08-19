'use client'

import { Plus } from '@hugeicons/core-free-icons'

import { AppIcon } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import type { NdaAgreementRow } from '../nda-actions'
import { AccountsToolbarTooltip } from './accounts-toolbar-tooltip'
import { NdaAddDialog } from './nda-add-dialog'
import { NdaAgreementEntry } from './nda-agreement-entry'
import { NdaDeleteDialog } from './nda-delete-dialog'
import { NdaDocumentIcon } from './nda-document-icon'
import { NdaStatusBadge } from './nda-status-badge'
import { useAccountDetailNda } from './use-account-detail-nda'

export function AccountDetailNdaPopover({
  companyId,
  companyName,
  initialAgreements,
  canManage,
  openOnMount = false,
}: {
  companyId: string
  companyName: string
  initialAgreements: NdaAgreementRow[]
  canManage: boolean
  /** z. B. aus Command-Center-Suche (?openNda=1) */
  openOnMount?: boolean
}) {
  const state = useAccountDetailNda({
    companyId,
    initialAgreements,
    openOnMount,
  })

  return (
    <TooltipProvider delayDuration={300}>
      <Sheet open={state.open} onOpenChange={state.handleSheetOpenChange}>
        <AccountsToolbarTooltip label="NDA-Verwaltung">
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-label="NDA-Verwaltung"
            >
              <NdaDocumentIcon className="size-[18px] text-foreground/85" />
            </Button>
          </SheetTrigger>
        </AccountsToolbarTooltip>

        <SheetContent
          side="right"
          showCloseButton
          className="flex h-full w-[min(480px,100vw)] max-w-[480px] flex-col gap-0 border-l p-0 sm:max-w-[480px]"
        >
          <SheetHeader className="space-y-3 border-b border-border px-4 py-4 pr-12 text-left">
            <SheetTitle className="text-base leading-tight">
              NDA & Vertragsdokumente
            </SheetTitle>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <NdaStatusBadge status={state.displayStatus} compact subtle />
              <span>
                {state.agreements.length}{' '}
                {state.agreements.length === 1 ? 'Vereinbarung' : 'Vereinbarungen'}
              </span>
              {!canManage ? (
                <span className="text-muted-foreground/80">· Nur Lesen</span>
              ) : null}
            </div>
          </SheetHeader>

          {state.expiringSoon > 0 ? (
            <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
              {state.expiringSoon === 1
                ? '1 NDA läuft in den nächsten 30 Tagen ab.'
                : `${state.expiringSoon} NDAs laufen in den nächsten 30 Tagen ab.`}
            </div>
          ) : null}

          <div
            className={cn(
              'min-h-0 flex-1 px-4',
              state.agreements.length === 0
                ? 'flex flex-col items-center justify-center text-center'
                : 'overflow-y-auto py-4',
            )}
          >
            {state.agreements.length === 0 ? (
              <div className="flex max-w-[320px] flex-col items-center px-4">
                <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted/60">
                  <NdaDocumentIcon className="size-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Noch keine NDA-Vereinbarung
                </p>
                <p className="mt-1 max-w-[280px] text-xs text-muted-foreground leading-relaxed">
                  Dokumentiere hier Vertraulichkeitsvereinbarungen mit {companyName} inkl.
                  PDF und Laufzeit.
                </p>
                {canManage ? (
                  <Button
                    type="button"
                    size="sm"
                    className="mt-4"
                    onClick={() => state.setAddOpen(true)}
                  >
                    <AppIcon icon={Plus} size={14} className="mr-1.5" />
                    Vertragsdokumente hinzufügen
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul className="space-y-2">
                {state.agreements.map((row) => (
                  <NdaAgreementEntry
                    key={`${row.id}:${row.document_version ?? ''}:${row.signed_at ?? ''}:${row.file_storage_path ?? ''}`}
                    row={row}
                    canManage={canManage}
                    uploadOpen={state.uploadPanelId === row.id}
                    onToggleUpload={() =>
                      state.setUploadPanelId((id) => (id === row.id ? null : row.id))
                    }
                    uploading={state.uploadingId === row.id}
                    downloading={state.downloadingId === row.id}
                    fileInputRef={(el) => {
                      state.fileInputRefs.current[row.id] = el
                    }}
                    onFileSelected={(file, meta) =>
                      void state.handleUpload(row.id, file, meta)
                    }
                    onDownload={() => void state.handleDownload(row.id)}
                    onDelete={() => state.setDeleteTarget(row)}
                  />
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <NdaAddDialog
        open={state.addOpen}
        onOpenChange={state.setAddOpen}
        pending={state.addPending}
        title={state.addTitle}
        onTitleChange={state.setAddTitle}
        status={state.addStatus}
        onStatusChange={state.setAddStatus}
        unlimited={state.addUnlimited}
        onUnlimitedChange={state.setAddUnlimited}
        validUntil={state.addValidUntil}
        onValidUntilChange={state.setAddValidUntil}
        pdfFile={state.addPdfFile}
        onPdfFileChange={state.handleAddPdfFile}
        notes={state.addNotes}
        onNotesChange={state.setAddNotes}
        onSubmit={() => void state.handleCreate()}
      />

      <NdaDeleteDialog
        open={!!state.deleteTarget}
        deleting={state.deleting}
        onOpenChange={(v) => {
          if (!v) state.setDeleteTarget(null)
        }}
        onConfirm={() => void state.confirmDelete()}
      />
    </TooltipProvider>
  )
}

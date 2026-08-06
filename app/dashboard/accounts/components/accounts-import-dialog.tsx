'use client'

import { useRef, useState } from 'react'
import { Download, Loader, UploadIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import type { AccountEntityKind } from '@/lib/accounts/account-entity'
import {
  ACCOUNTS_IMPORT_ACCEPT,
  downloadAccountsImportTemplate,
  isAccountsImportFile,
} from '@/lib/accounts/accounts-import-shared'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityKind: AccountEntityKind
  importing: boolean
  onImport: (file: File) => boolean | Promise<boolean>
}

export function AccountsImportDialog({
  open,
  onOpenChange,
  entityKind,
  importing,
  onImport,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const isPartner = entityKind === 'partner'
  const copy = isPartner ? COPY.accounts.importPartner : COPY.accounts.importAccount

  function resetFile() {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleOpenChange(next: boolean) {
    if (importing) return
    if (!next) resetFile()
    onOpenChange(next)
  }

  function acceptFile(next: File | undefined) {
    if (!next) return
    if (!isAccountsImportFile(next)) {
      toast.error(COPY.accounts.importInvalidFile)
      return
    }
    setFile(next)
  }

  async function handleSubmit() {
    if (!file || importing) return
    const ok = await onImport(file)
    if (!ok) return
    resetFile()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2"
            disabled={importing}
            onClick={() => {
              void downloadAccountsImportTemplate(entityKind).catch(() => {
                toast.error('Vorlage konnte nicht geladen werden.')
              })
            }}
          >
            <AppIcon icon={Download} size={16} aria-hidden />
            {COPY.accounts.importTemplateDownload}
          </Button>

          <div
            role="button"
            tabIndex={importing ? -1 : 0}
            aria-disabled={importing}
            className={cn(
              'w-full rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
              dragOver && !importing
                ? 'border-primary/50 bg-primary/5'
                : 'border-border bg-muted/20',
              importing
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer hover:border-border/80 hover:bg-muted/40',
            )}
            onClick={() => !importing && inputRef.current?.click()}
            onKeyDown={(e) => {
              if (importing) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!importing) setDragOver(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!importing) setDragOver(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDragOver(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDragOver(false)
              if (importing) return
              acceptFile(e.dataTransfer.files?.[0])
            }}
          >
            {importing ? (
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <AppIcon icon={Loader} size={22} className="animate-spin" />
                {COPY.accounts.importInProgress}
              </div>
            ) : file ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{copy.fileSelectedHint}</p>
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    resetFile()
                  }}
                >
                  {COPY.accounts.importRemoveFile}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <AppIcon
                  icon={UploadIcon}
                  size={24}
                  className="text-muted-foreground"
                  aria-hidden
                />
                <p className="text-sm font-medium text-foreground">
                  {copy.dropzoneTitle}
                </p>
                <p className="text-xs text-muted-foreground">{copy.dropzoneHint}</p>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCOUNTS_IMPORT_ACCEPT}
            className="sr-only"
            disabled={importing}
            onChange={(e) => {
              acceptFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={importing}
            onClick={() => handleOpenChange(false)}
          >
            {COPY.accounts.importCancel}
          </Button>
          <Button
            type="button"
            disabled={!file || importing}
            onClick={() => void handleSubmit()}
          >
            {importing ? (
              <>
                <AppIcon icon={Loader} size={16} className="animate-spin" />
                {COPY.accounts.importInProgress}
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { Cancel01Icon, CopyIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AppIcon } from '@/lib/icons'

import type { ReferenceRow } from '../actions'
import { ReferenceReader } from '../reference-reader'

export function ReferencePreviewDialog({
  previewRefs,
  onClose,
}: {
  previewRefs: ReferenceRow[] | null
  onClose: () => void
}) {
  const open = previewRefs !== null && previewRefs.length > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 z-50 flex flex-col rounded-none border-0 p-0 overflow-hidden bg-background !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 !w-full !h-full"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between border-b bg-background px-6 py-4">
            <h2 className="text-lg font-semibold">
              {previewRefs && previewRefs.length > 1
                ? `Portfolio-Vorschau (${previewRefs.length} Referenzen)`
                : 'Vorschau – Kundenansicht'}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Schließen"
            >
              <AppIcon icon={Cancel01Icon} size={20} />
            </Button>
          </header>
          <div className="preview-modal-scroll flex-1 min-h-0 overflow-y-auto p-8 md:p-16 lg:p-24 space-y-20 max-w-[100vw]">
            {previewRefs?.map((ref) => (
              <ReferenceReader key={ref.id} reference={ref} />
            ))}
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t bg-muted/30 px-6 py-4">
            <Button variant="outline" size="sm" disabled className="opacity-70">
              PDF Export (Coming Soon)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = typeof window !== 'undefined' ? window.location.href : ''
                void navigator.clipboard?.writeText(url).then(() =>
                  toast.success('Link in Zwischenablage kopiert.'),
                )
              }}
            >
              <AppIcon icon={CopyIcon} size={16} className="mr-2" />
              Link teilen
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}

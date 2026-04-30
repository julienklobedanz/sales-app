'use client'

import { Cancel01Icon, CopyIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[min(1200px,66vw)] max-w-none border-l border-slate-200 bg-slate-50 p-0"
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <SheetHeader className="shrink-0 border-b bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-lg font-semibold">
              {previewRefs && previewRefs.length > 1
                ? `Portfolio-Vorschau (${previewRefs.length} Referenzen)`
                : 'Vorschau – Kundenansicht'}
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Schließen"
              >
                <AppIcon icon={Cancel01Icon} size={20} />
              </Button>
            </div>
          </SheetHeader>
          <div className="preview-modal-scroll min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            {previewRefs?.map((ref) => (
              <ReferenceReader key={ref.id} reference={ref} />
            ))}
          </div>
          <footer className="sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
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
      </SheetContent>
    </Sheet>
  )
}

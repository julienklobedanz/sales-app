'use client'

import { Cancel01Icon, CopyIcon } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AppIcon } from '@/lib/icons'

import type { ReferenceRow } from '../actions'
import { ReferenceReader } from '../reference-reader'

type PdfTemplate = 'one_pager' | 'detail' | 'anonymized'

export function ReferencePreviewDialog({
  previewRefs,
  onClose,
}: {
  previewRefs: ReferenceRow[] | null
  onClose: () => void
}) {
  const open = previewRefs !== null && previewRefs.length > 0
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplate>('one_pager')
  const pageCountPerReference = pdfTemplate === 'detail' ? 2 : 1
  const totalEstimatedPages = (previewRefs?.length ?? 0) * pageCountPerReference

  async function handleExportPdf() {
    if (!previewRefs || previewRefs.length === 0) return
    setPdfLoading(true)
    try {
      const res = await fetch('/api/pdf/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceIds: previewRefs.map((ref) => ref.id),
          template: pdfTemplate,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? 'PDF-Export fehlgeschlagen.')
      }
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition') ?? ''
      const match = contentDisposition.match(/filename="(.+)"/)
      const fileName = match?.[1] ?? 'RefStack_Portfolio.pdf'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Portfolio-PDF wird heruntergeladen.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'PDF-Export fehlgeschlagen.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="max-sm:!w-[100vw] max-sm:!max-w-[100vw] !w-[66.666vw] !max-w-[66.666vw] border-r border-slate-200 bg-slate-50 p-0"
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
            <div className="mr-auto flex items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={pdfTemplate === 'one_pager' ? 'secondary' : 'ghost'}
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setPdfTemplate('one_pager')}
                  disabled={pdfLoading}
                >
                  One-Pager
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={pdfTemplate === 'detail' ? 'secondary' : 'ghost'}
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setPdfTemplate('detail')}
                  disabled={pdfLoading}
                >
                  Detail
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={pdfTemplate === 'anonymized' ? 'secondary' : 'ghost'}
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setPdfTemplate('anonymized')}
                  disabled={pdfLoading}
                >
                  Anonymisiert
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                ~{totalEstimatedPages} Seite{totalEstimatedPages === 1 ? '' : 'n'} gesamt
              </span>
            </div>
            <Button variant="outline" size="sm" disabled={pdfLoading} onClick={() => void handleExportPdf()}>
              {pdfLoading ? 'PDF wird erstellt...' : 'PDF Export'}
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

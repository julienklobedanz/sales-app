'use client'

import { useMemo, useState } from 'react'
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

type PdfTemplate = 'one_pager' | 'detail' | 'anonymized'

const TEMPLATE_OPTIONS: Array<{
  key: PdfTemplate
  title: string
  description: string
}> = [
  {
    key: 'one_pager',
    title: 'One-Pager',
    description: 'Kompakte 1-Seiten-Uebersicht fuer schnelle Sales-Calls.',
  },
  {
    key: 'detail',
    title: 'Detail',
    description: 'Mehrseitig mit Herausforderung, Loesung und Projektdetails.',
  },
  {
    key: 'anonymized',
    title: 'Anonymisiert',
    description: 'NDA-sichere Ausgabe ohne konkrete Kundendaten.',
  },
]

export function PdfExportDialog({ referenceId }: { referenceId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [template, setTemplate] = useState<PdfTemplate>('one_pager')

  const currentTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find((opt) => opt.key === template),
    [template]
  )

  async function downloadPdf() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/pdf?referenceId=${encodeURIComponent(referenceId)}&template=${encodeURIComponent(template)}`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? 'PDF-Export fehlgeschlagen.')
      }
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition') ?? ''
      const match = contentDisposition.match(/filename="(.+)"/)
      const fileName = match?.[1] ?? 'RefStack.pdf'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('PDF wird heruntergeladen.')
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'PDF-Export fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        PDF exportieren
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PDF exportieren</DialogTitle>
            <DialogDescription>
              Template auswaehlen und als gebrandetes PDF herunterladen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {TEMPLATE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTemplate(opt.key)}
                className={`rounded-lg border p-3 text-left transition ${
                  template === opt.key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <div className="text-sm font-semibold">{opt.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{opt.description}</div>
              </button>
            ))}
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Vorschau: <span className="font-medium text-foreground">{currentTemplate?.title}</span> Template
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={loading} onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={downloadPdf} disabled={loading}>
              {loading ? 'Erzeuge PDF ...' : 'Herunterladen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

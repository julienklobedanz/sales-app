'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FileDownIcon } from '@hugeicons/core-free-icons'
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

type PdfTemplate = 'one_pager' | 'detail' | 'anonymized'

const TEMPLATE_OPTIONS: Array<{
  key: PdfTemplate
  title: string
  description: string
  mini: {
    pages: number
    anonymized?: boolean
  }
}> = [
  {
    key: 'one_pager',
    title: 'One-Pager',
    description: 'Kompakte 1-Seiten-Uebersicht fuer schnelle Sales-Calls.',
    mini: { pages: 1 },
  },
  {
    key: 'detail',
    title: 'Detail',
    description: 'Mehrseitig mit Herausforderung, Loesung und Projektdetails.',
    mini: { pages: 2 },
  },
  {
    key: 'anonymized',
    title: 'Anonymisiert',
    description: 'NDA-sichere Ausgabe ohne konkrete Kundendaten.',
    mini: { pages: 1, anonymized: true },
  },
]

export function PdfExportDialog({
  referenceId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTriggerButton = true,
}: {
  referenceId: string
  /** Optional: Dialog von außen öffnen (z. B. Match-Karten) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Bei externer Steuerung (`open` gesetzt) standardmäßig kein Button */
  showTriggerButton?: boolean
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  function setOpen(v: boolean) {
    if (controlledOpen !== undefined) controlledOnOpenChange?.(v)
    else setInternalOpen(v)
  }
  const showButton = showTriggerButton && controlledOpen === undefined
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
      {showButton ? (
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <AppIcon icon={FileDownIcon} size={16} />
          PDF exportieren
        </Button>
      ) : null}
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{opt.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{opt.description}</div>
                  </div>
                  <div className="inline-flex items-end gap-1 rounded-md border bg-background px-2 py-1">
                    {Array.from({ length: opt.mini.pages }).map((_, i) => (
                      <div
                        key={`${opt.key}-${i}`}
                        className="h-10 w-7 rounded-sm border bg-muted/60"
                      />
                    ))}
                    {opt.mini.anonymized ? (
                      <span className="text-[10px] text-muted-foreground">NDA</span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Vorschau-Miniatur: <span className="font-medium text-foreground">{currentTemplate?.title}</span>
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

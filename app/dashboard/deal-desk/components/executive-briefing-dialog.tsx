'use client'

import { useState } from 'react'
import { ClipboardCopy, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { buildExecutiveBriefingText } from '@/lib/deal-desk/executive-briefing'
import type { DealDeskMockAnalysis } from '@/lib/deal-desk/mock-analysis'
import type { DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header)
  return m?.[1]?.trim() ?? null
}

type Props = {
  projectId: string
  projectName: string
  analysis: DealDeskMockAnalysis
  redFlags?: DealDeskRedFlag[]
  className?: string
}

export function ExecutiveBriefingDialog({
  projectId,
  projectName,
  analysis,
  redFlags,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pptxPending, setPptxPending] = useState(false)
  const briefing = buildExecutiveBriefingText({ projectName, analysis, redFlags })

  async function copyBriefing() {
    try {
      await navigator.clipboard.writeText(briefing)
      toast.success('Executive Briefing in die Zwischenablage kopiert.')
    } catch {
      toast.error('Kopieren fehlgeschlagen.')
    }
  }

  async function downloadPptx() {
    setPptxPending(true)
    try {
      const res = await fetch(
        `/api/deal-desk/executive-briefing-pptx?projectId=${encodeURIComponent(projectId)}`,
        { method: 'GET', credentials: 'same-origin' }
      )
      if (!res.ok) {
        let msg = 'PPTX-Export fehlgeschlagen.'
        try {
          const j = (await res.json()) as { error?: string }
          if (j.error) msg = j.error
        } catch {
          /* ignore */
        }
        toast.error(msg)
        return
      }
      const blob = await res.blob()
      const fallback = 'RefStack_Executive_Briefing.pptx'
      const fromHeader = parseFilenameFromContentDisposition(res.headers.get('Content-Disposition'))
      const fileName = fromHeader ? decodeURIComponent(fromHeader.replace(/^"|"$/g, '')) : fallback
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Briefing-Slides wurden heruntergeladen.')
    } catch {
      toast.error('Netzwerkfehler beim PPTX-Export.')
    } finally {
      setPptxPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
        >
          <FileText className="size-3.5" aria-hidden />
          Executive Briefing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(85vh,640px)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Executive Briefing</DialogTitle>
          <DialogDescription>
            Kompakte Bid-Zusammenfassung für interne Freigabe per E-Mail (Management, ohne
            Qualification Call).
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[min(50vh,400px)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
          {briefing}
        </pre>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Schließen
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pptxPending}
            onClick={() => void downloadPptx()}
            className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2"
          >
            {pptxPending ? 'PPTX wird erstellt…' : 'Briefing-Slides (PPTX)'}
            <Download className="size-3.5 opacity-70" aria-hidden />
          </Button>
          <Button type="button" className="gap-2" onClick={() => void copyBriefing()}>
            <ClipboardCopy className="size-3.5" aria-hidden />
            Alles kopieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

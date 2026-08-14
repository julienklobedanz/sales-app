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
import type { DealDeskMockAnalysis, DealDeskRedFlag } from '@/lib/deal-desk/deal-analysis-types'
import { COPY } from '@/lib/copy'

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header)
  return m?.[1]?.trim() ?? null
}

type Props = {
  dealId: string
  projectName: string
  analysis: DealDeskMockAnalysis
  redFlags: DealDeskRedFlag[]
  className?: string
}

export function DealExecutiveBriefingDialog({
  dealId,
  projectName,
  analysis,
  redFlags,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pdfPending, setPdfPending] = useState(false)
  const briefing = buildExecutiveBriefingText({ projectName, analysis, redFlags })

  async function copyBriefing() {
    try {
      await navigator.clipboard.writeText(briefing)
      toast.success(COPY.deals.cockpit.briefingCopied)
    } catch {
      toast.error(COPY.deals.cockpit.briefingCopyFailed)
    }
  }

  async function downloadPdf() {
    setPdfPending(true)
    try {
      const res = await fetch(
        `/api/deals/${encodeURIComponent(dealId)}/executive-briefing/pdf`,
        {
          method: 'GET',
          credentials: 'same-origin',
        },
      )
      if (!res.ok) {
        let msg: string = COPY.deals.cockpit.briefingPdfFailed
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
      const fallback = 'Executive_Briefing.pdf'
      const fromHeader = parseFilenameFromContentDisposition(
        res.headers.get('Content-Disposition'),
      )
      const fileName = fromHeader
        ? decodeURIComponent(fromHeader.replace(/^"|"$/g, ''))
        : fallback
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(COPY.deals.cockpit.briefingPdfSuccess)
    } catch {
      toast.error(COPY.deals.cockpit.briefingPdfFailed)
    } finally {
      setPdfPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={className}>
          <FileText className="size-3.5" aria-hidden />
          {COPY.deals.cockpit.generateBriefing}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(85vh,640px)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{COPY.deals.cockpit.briefingDialogTitle}</DialogTitle>
          <DialogDescription>
            {COPY.deals.cockpit.briefingDialogDescription}
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[min(50vh,400px)] overflow-y-auto rounded-xl border border-border bg-muted p-4 text-xs leading-relaxed whitespace-pre-wrap text-foreground">
          {briefing}
        </pre>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Schließen
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pdfPending}
            onClick={() => void downloadPdf()}
            className="gap-2"
          >
            {pdfPending
              ? COPY.deals.cockpit.briefingPdfPending
              : COPY.deals.cockpit.briefingPdfCta}
            <Download className="size-3.5 opacity-70" aria-hidden />
          </Button>
          <Button type="button" className="gap-2" onClick={() => void copyBriefing()}>
            <ClipboardCopy className="size-3.5" aria-hidden />
            {COPY.deals.cockpit.briefingCopyCta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

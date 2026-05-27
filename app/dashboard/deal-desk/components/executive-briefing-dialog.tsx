'use client'

import { useState } from 'react'
import { ClipboardCopy, FileText } from 'lucide-react'
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

type Props = {
  projectName: string
  analysis: DealDeskMockAnalysis
  redFlags?: DealDeskRedFlag[]
  className?: string
}

export function ExecutiveBriefingDialog({
  projectName,
  analysis,
  redFlags,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const briefing = buildExecutiveBriefingText({ projectName, analysis, redFlags })

  async function copyBriefing() {
    try {
      await navigator.clipboard.writeText(briefing)
      toast.success('Executive Briefing in die Zwischenablage kopiert.')
    } catch {
      toast.error('Kopieren fehlgeschlagen.')
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
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Schließen
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

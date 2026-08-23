'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AiDraftComposer } from './ai-draft-composer'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  referenceId: string
  referenceTitle: string
  matchScore: number
  dealId?: string | null
  /** Freitext: Deal-Felder für den Prompt (optional, aber empfohlen aus Match-Kontext). */
  dealContext?: string | null
}

/**
 * Epic 5 / Wireframe §15: Sheet-Hülle um Format, Tonalität, Stream, Editor, Kopieren, Neu generieren.
 */
export function AiDraftSheet({
  open,
  onOpenChange,
  referenceId,
  referenceTitle,
  matchScore,
  dealId,
  dealContext,
}: Props) {
  const scorePct = Math.round(Math.min(1, Math.max(0, matchScore)) * 100)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className="flex h-full w-[min(540px,100vw)] max-w-[540px] flex-col gap-0 border-l p-0 sm:max-w-[540px]"
      >
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>KI-Entwurf generieren</SheetTitle>
          <div className="text-muted-foreground space-y-1 text-sm">
            <div>
              Basierend auf:{' '}
              <span className="text-foreground font-medium">{referenceTitle}</span>
            </div>
            <div>
              Match-Score:{' '}
              <span className="text-foreground font-medium font-mono tabular-nums">
                {scorePct} %
              </span>
            </div>
          </div>
        </SheetHeader>

        {open ? (
          <AiDraftComposer
            key={referenceId}
            referenceId={referenceId}
            referenceTitle={referenceTitle}
            matchScore={matchScore}
            dealId={dealId}
            dealContext={dealContext}
            showMeta={false}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

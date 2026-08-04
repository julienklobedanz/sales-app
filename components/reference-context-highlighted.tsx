import type { ReactNode } from 'react'
import { splitTextWithContextHighlights } from '@/lib/references/reference-context-highlights'

type Props = {
  text: string | null | undefined
  phrases: string[]
  /** Zahlen, Prozent und gängige Währungsbeträge zusätzlich hervorheben (Default: true) */
  includeNumeric?: boolean
  emptyFallback?: ReactNode
}

export function ReferenceContextHighlighted({
  text,
  phrases,
  includeNumeric = true,
  emptyFallback,
}: Props) {
  const raw = String(text ?? '')
  if (!raw.trim()) {
    return emptyFallback ?? <span className="text-muted-foreground">—</span>
  }

  const segments = splitTextWithContextHighlights(raw, phrases, { includeNumeric })
  return (
    <>
      {segments.map((seg, i) =>
        seg.emph ? (
          <strong key={`e-${i}`} className="font-semibold text-foreground">
            {seg.text}
          </strong>
        ) : (
          <span key={`t-${i}`}>{seg.text}</span>
        ),
      )}
    </>
  )
}

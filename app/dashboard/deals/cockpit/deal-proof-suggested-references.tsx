'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CirclePlus, Loader } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { cn } from '@/lib/utils'
import { addReferenceToDealWithScore } from '../actions'
import type { DealReferenceSuggestion } from '@/lib/deals/suggest-deal-reference-matches'

export function DealProofSuggestedReferences({
  dealId,
  suggestions,
  onSuggestionsChange,
}: {
  dealId: string
  suggestions: DealReferenceSuggestion[]
  onSuggestionsChange?: (next: DealReferenceSuggestion[]) => void
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (suggestions.length === 0) return null

  async function handleAdd(s: DealReferenceSuggestion) {
    setPendingId(s.id)
    try {
      const res = await addReferenceToDealWithScore({
        dealId,
        referenceId: s.id,
        similarityScore: s.similarity,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Konnte Referenz nicht verknüpfen.')
        return
      }
      toast.success('Referenz zum Deal hinzugefügt.')
      onSuggestionsChange?.(suggestions.filter((x) => x.id !== s.id))
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="mb-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {COPY.deals.cockpit.proofSuggestedTitle}
      </p>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li
            key={s.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border border-dashed border-muted-foreground/35',
              'bg-muted/10 px-3 py-2.5 italic text-muted-foreground'
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium not-italic text-foreground/80">{s.title}</p>
              <p className="text-xs">
                {s.companyName}
                {s.similarity > 0 ? ` · ${Math.round(s.similarity * 100)} % Match` : ''}
              </p>
              {s.snippet ? (
                <p className="mt-1 line-clamp-2 text-xs">{s.snippet}</p>
              ) : null}
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="shrink-0 not-italic"
              disabled={pendingId === s.id}
              title={COPY.deals.cockpit.proofSuggestedAdd}
              onClick={() => handleAdd(s)}
            >
              {pendingId === s.id ? (
                <AppIcon icon={Loader} size={16} className="animate-spin" />
              ) : (
                <AppIcon icon={CirclePlus} size={18} />
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

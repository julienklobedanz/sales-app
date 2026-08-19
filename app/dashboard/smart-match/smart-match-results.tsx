'use client'

import { MatchResultSkeleton } from '@/components/dashboard/match-result-skeleton'
import { MatchResultCard } from '@/app/dashboard/deals/components/match-result-card'
import { Hinweis } from '@/components/ui/hinweis'
import type { MatchReferenceHit } from '@/lib/match/match-types'
import type { DealRow } from '@/app/dashboard/deals/types'
import { dealContextString } from '@/app/dashboard/smart-match/smart-match-shell-helpers'

export function SmartMatchResults({
  loading,
  results,
  selectedDealId,
  selectedDeal,
  linkedIds,
  onLinked,
}: {
  loading: boolean
  results: MatchReferenceHit[] | null
  selectedDealId: string | null
  selectedDeal: DealRow | null
  linkedIds: Set<string>
  onLinked: () => void
}) {
  if (loading) {
    return <MatchResultSkeleton count={3} />
  }

  if (results && results.length > 0) {
    return (
      <div className="space-y-3">
        {results.map((m, i) => {
          const next = results[i + 1]
          const gapToNext =
            next && m.similarity >= 0 && next.similarity >= 0
              ? m.similarity - next.similarity
              : null
          return (
            <MatchResultCard
              key={m.id}
              hit={m}
              dealId={selectedDealId ?? undefined}
              dealContext={dealContextString(selectedDeal)}
              alreadyLinked={linkedIds.has(m.id)}
              onLinked={onLinked}
              rank={i + 1}
              gapToNext={gapToNext}
            />
          )
        })}
      </div>
    )
  }

  /* Ehrlicher Leerzustand statt Fake-Treffer (Proof over Promise) */
  return (
    <Hinweis tone="destructive" className="px-4 py-3 text-[13.5px]">
      ⚠ Keine passenden Referenzen für diese Anfrage gefunden.
    </Hinweis>
  )
}

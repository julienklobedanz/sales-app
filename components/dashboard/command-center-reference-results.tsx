'use client'

import type { HomepageSemanticReferenceHit } from '@/lib/command-center/homepage-semantic-types'
import type { MatchReferenceHit } from '@/app/dashboard/actions'
import { MatchResultCard } from '@/app/dashboard/deals/components/match-result-card'
type Props = {
  query: string
  hits: HomepageSemanticReferenceHit[]
}

function toMatchHit(hit: HomepageSemanticReferenceHit): MatchReferenceHit {
  return {
    id: hit.id,
    title: hit.title,
    summary: hit.summary,
    industry: hit.industry,
    similarity: hit.similarity,
    snippet: hit.snippet,
    companyName: hit.companyName,
    companyId: hit.companyId,
    companyLogoUrl: hit.companyLogoUrl,
    volumeEur: hit.volumeEur,
  }
}

export function CommandCenterReferenceResults({ query, hits }: Props) {
  if (!hits.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-800">Keine passenden Referenzen</p>
        <p className="mt-2 text-sm text-slate-500">
          Für „{query}“ wurden keine Treffer über dem Ähnlichkeits-Schwellenwert gefunden. Formuliere die
          Anfrage in eigenen Worten oder probiere eine der Vorschläge.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-900">{hits.length}</span>{' '}
        {hits.length === 1 ? 'Referenz' : 'Referenzen'} für „{query}“
      </p>
      <ul className="space-y-3">
        {hits.map((hit) => (
          <li key={hit.id}>
            <MatchResultCard hit={toMatchHit(hit)} alreadyLinked={false} onLinked={() => {}} />
          </li>
        ))}
      </ul>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'

import type { MatchReferenceHit } from '@/app/dashboard/actions'
import { MatchResultCard } from '@/app/dashboard/deals/components/match-result-card'
import { SearchResultRow } from '@/components/dashboard/command-center-search-results'
import type { HomepageSemanticReferenceHit } from '@/lib/command-center/homepage-semantic-types'
import {
  countHomepageSearchHits,
  hasAnyHomepageSearchHit,
  type HomepageSearchGroups,
} from '@/lib/command-center/homepage-universal-types'
import { hrefForCommandSearchResult } from '@/lib/command-center/search-navigation'
import type { CommandSearchResult } from '@/lib/command-center/global-search'

const HOMEPAGE_GROUP_LABELS = {
  marketSignals: 'Marktsignale',
  certificates: 'Zertifikate & Security',
  documents: 'Dokumente',
} as const

const SECTION_HEADING_CLASS =
  'border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400'

const ROW_CLASS =
  'flex w-full cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors last:border-b-0 hover:bg-slate-50'

type Props = {
  query: string
  referenceHits: HomepageSemanticReferenceHit[]
  groups: HomepageSearchGroups
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

function HomepageBucketSection({
  label,
  count,
  items,
  onSelect,
}: {
  label: string
  count: number
  items: CommandSearchResult[]
  onSelect: (item: CommandSearchResult) => void
}) {
  if (!items.length) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <p className={SECTION_HEADING_CLASS}>
        {label} ({count})
      </p>
      <ul>
        {items.map((item) => (
          <li key={`${item.kind}:${item.id}`}>
            <button type="button" onClick={() => onSelect(item)} className={ROW_CLASS}>
              <SearchResultRow item={item} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CommandCenterHomepageResults({ query, referenceHits, groups }: Props) {
  const router = useRouter()

  if (!hasAnyHomepageSearchHit(referenceHits, groups)) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-800">Keine Treffer</p>
        <p className="mt-2 text-sm text-slate-500">
          Für „{query}“ wurden keine Ergebnisse gefunden. Formuliere die Anfrage anders oder probiere
          eine der Vorschläge.
        </p>
      </div>
    )
  }

  const total = countHomepageSearchHits(referenceHits, groups)
  const gapToNext =
    referenceHits.length > 1 ? referenceHits[0]!.similarity - referenceHits[1]!.similarity : null

  function openResult(item: CommandSearchResult) {
    router.push(hrefForCommandSearchResult(item))
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-900">{total}</span>{' '}
        {total === 1 ? 'Ergebnis' : 'Ergebnisse'} für „{query}“
      </p>

      {referenceHits.length > 0 ? (
        <section className="space-y-3">
          <p className={SECTION_HEADING_CLASS + ' rounded-t-2xl border border-slate-200'}>
            Referenzen ({referenceHits.length})
          </p>
          <ul className="space-y-3">
            {referenceHits.map((hit, index) => (
              <li key={hit.id}>
                <MatchResultCard
                  hit={toMatchHit(hit)}
                  alreadyLinked={false}
                  onLinked={() => {}}
                  rank={index + 1}
                  gapToNext={index === 0 ? gapToNext : null}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <HomepageBucketSection
        label={HOMEPAGE_GROUP_LABELS.marketSignals}
        count={groups.marketSignals.length}
        items={groups.marketSignals}
        onSelect={openResult}
      />

      <HomepageBucketSection
        label={HOMEPAGE_GROUP_LABELS.certificates}
        count={groups.certificates.length}
        items={groups.certificates}
        onSelect={openResult}
      />

      <HomepageBucketSection
        label={HOMEPAGE_GROUP_LABELS.documents}
        count={groups.documents.length}
        items={groups.documents}
        onSelect={openResult}
      />
    </div>
  )
}

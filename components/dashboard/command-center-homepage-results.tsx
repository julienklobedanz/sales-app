'use client'

import { useRouter } from 'next/navigation'

import type { MatchReferenceHit } from '@/lib/match/match-types'
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
  'border-b border-border bg-muted/50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'

const ROW_CLASS =
  'flex w-full cursor-pointer items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-left text-sm text-foreground transition-colors last:border-b-0 hover:bg-muted'

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
    createdAt: hit.createdAt,
  }
}

function HomepageGroupSection({
  label,
  count,
  children,
}: {
  label: string
  count: number
  children: React.ReactNode
}) {
  if (count === 0) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <p className={SECTION_HEADING_CLASS}>
        {label} ({count})
      </p>
      {children}
    </section>
  )
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
    <HomepageGroupSection label={label} count={count}>
      <ul>
        {items.map((item) => (
          <li key={`${item.kind}:${item.id}`}>
            <button type="button" onClick={() => onSelect(item)} className={ROW_CLASS}>
              <SearchResultRow item={item} />
            </button>
          </li>
        ))}
      </ul>
    </HomepageGroupSection>
  )
}

export function CommandCenterHomepageResults({ query, referenceHits, groups }: Props) {
  const router = useRouter()

  if (!hasAnyHomepageSearchHit(referenceHits, groups)) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/60 px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">Keine Treffer</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Für „{query}“ wurden keine Ergebnisse gefunden. Formuliere die Anfrage anders
          oder probiere eine der Vorschläge.
        </p>
      </div>
    )
  }

  const total = countHomepageSearchHits(referenceHits, groups)
  const gapToNext =
    referenceHits.length > 1
      ? referenceHits[0]!.similarity - referenceHits[1]!.similarity
      : null

  function openResult(item: CommandSearchResult) {
    router.push(hrefForCommandSearchResult(item))
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{total}</span>{' '}
        {total === 1 ? 'Ergebnis' : 'Ergebnisse'} für „{query}“
      </p>

      {referenceHits.length > 0 ? (
        <HomepageGroupSection label="Referenzen" count={referenceHits.length}>
          <ul>
            {referenceHits.map((hit, index) => (
              <li key={hit.id} className="border-b border-border last:border-b-0">
                <MatchResultCard
                  variant="embedded"
                  hit={toMatchHit(hit)}
                  alreadyLinked={false}
                  onLinked={() => {}}
                  rank={index + 1}
                  gapToNext={index === 0 ? gapToNext : null}
                />
              </li>
            ))}
          </ul>
        </HomepageGroupSection>
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

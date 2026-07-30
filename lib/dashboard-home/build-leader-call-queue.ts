import type { DealRow } from '@/app/dashboard/deals/types'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { formatRoleChangeFact } from '@/lib/market-signals/signal-intelligence'
import type { LeaderCallQueueRow } from '@/lib/dashboard-home/dashboard-home-types'

const PARTIAL_MATCH_CUTOFF = 0.47
const MAX_AGE_DAYS = 45
const MS_PER_DAY = 24 * 60 * 60 * 1000

export type LeaderCallSignalCandidate = {
  signalKey: string
  kind: 'exec' | 'news'
  companyId: string
  companyName: string
  companyLogoUrl: string | null
  personName: string | null
  signalFact: string
  whyNowRaw: string | null
  detectedAtMs: number
  onChampionWatchlist: boolean
  onAccountWatchlist: boolean
  signalCategory: 'people' | 'finance' | 'strategy' | null
}

export type LeaderCallDealContext = {
  dealId: string
  dealTitle: string
  linkedCount: number
  bestMatchScore: number | null
  expiryDate: string | null
}

export type LeaderCallMatchResult = {
  referenceId: string
  referenceTitle: string
  similarity: number
  personMatchHint: boolean
}

export function pickDealForCompany(
  deals: DealRow[],
  companyId: string
): LeaderCallDealContext | null {
  const onCompany = deals.filter(
    (d) => d.company_id === companyId && ['open', 'rfp', 'negotiation'].includes(d.status)
  )
  if (!onCompany.length) return null

  const scoreDeal = (d: DealRow) => {
    const linked = d.linked_refs?.length ?? 0
    const best = d.best_match_score ?? 0
    let risk = 0
    if (linked === 0) risk += 40
    else if (best < PARTIAL_MATCH_CUTOFF) risk += 25
    const days = d.expiry_date
      ? Math.round(
          (new Date(`${d.expiry_date}T12:00:00`).getTime() - Date.now()) / MS_PER_DAY
        )
      : 999
    if (days >= 0 && days <= 21) risk += 15
    return risk
  }

  const sorted = [...onCompany].sort((a, b) => scoreDeal(b) - scoreDeal(a))
  const d = sorted[0]!
  return {
    dealId: d.id,
    dealTitle: d.title,
    linkedCount: d.linked_refs?.length ?? 0,
    bestMatchScore: d.best_match_score ?? null,
    expiryDate: d.expiry_date,
  }
}

export function scoreCallCandidate(
  candidate: LeaderCallSignalCandidate,
  deal: LeaderCallDealContext,
  match: LeaderCallMatchResult | null,
  nowMs: number
): number {
  const ageDays = (nowMs - candidate.detectedAtMs) / MS_PER_DAY
  if (ageDays > MAX_AGE_DAYS) return -1

  let score = 100 - Math.min(ageDays, MAX_AGE_DAYS) * 1.5
  if (candidate.onChampionWatchlist) score += 28
  if (candidate.onAccountWatchlist) score += 18
  if (candidate.signalCategory === 'people') score += 12
  if (deal.linkedCount === 0) score += 22
  else if (
    deal.bestMatchScore == null ||
    deal.bestMatchScore < PARTIAL_MATCH_CUTOFF
  ) {
    score += 14
  }
  if (match && match.similarity >= PARTIAL_MATCH_CUTOFF) score += 20
  if (match?.personMatchHint) score += 12
  if (/cio|cto|ceo|chief|wechsel|azure|cloud|initiative|stelle/i.test(candidate.signalFact)) {
    score += 8
  }
  return score
}

export function buildCallWhyNowBullets(input: {
  candidate: LeaderCallSignalCandidate
  deal: LeaderCallDealContext
  match: LeaderCallMatchResult | null
}): string[] {
  const bullets: string[] = []
  const copy = COPY.dashboard.home.salesLeader

  if (input.candidate.onChampionWatchlist && input.candidate.personName) {
    bullets.push(
      formatCopyPerson(copy.whyChampion, { name: input.candidate.personName })
    )
  } else if (input.candidate.onAccountWatchlist) {
    bullets.push(copy.whyWatchlistAccount)
  }

  if (input.candidate.whyNowRaw?.trim()) {
    bullets.push(input.candidate.whyNowRaw.trim())
  } else if (/wechsel|ernannt|übernimmt|joins|cio|cto/i.test(input.candidate.signalFact)) {
    bullets.push(copy.whyRoleChange)
  } else if (/cloud|azure|aws|initiative|digital/i.test(input.candidate.signalFact)) {
    bullets.push(copy.whyInitiative)
  } else if (/stelle|hiring|recruit|sucht/i.test(input.candidate.signalFact)) {
    bullets.push(copy.whyHiring)
  }

  if (input.match && input.match.similarity >= PARTIAL_MATCH_CUTOFF) {
    bullets.push(
      input.match.personMatchHint ? copy.whyPerfectRefPerson : copy.whyPerfectRef
    )
  } else if (input.deal.linkedCount === 0) {
    bullets.push(copy.whyDealNoProof)
  }

  const unique = [...new Set(bullets.map((b) => b.trim()).filter(Boolean))]
  return unique.slice(0, 4)
}

function formatCopyPerson(template: string, vars: { name: string }) {
  return template.replace('{name}', vars.name)
}

export function buildLeaderCallQueueRow(input: {
  candidate: LeaderCallSignalCandidate
  deal: LeaderCallDealContext
  match: LeaderCallMatchResult | null
}): LeaderCallQueueRow {
  const { candidate, deal, match } = input
  const perfectReference = Boolean(match && match.similarity >= PARTIAL_MATCH_CUTOFF)
  const bullets = buildCallWhyNowBullets({ candidate, deal, match })

  let tone: LeaderCallQueueRow['tone'] = 'intent'
  if (deal.linkedCount === 0) tone = 'gap'
  else if (!perfectReference) tone = 'warn'
  else tone = 'ok'

  return {
    id: candidate.signalKey,
    signalKey: candidate.signalKey,
    companyId: candidate.companyId,
    companyName: candidate.companyName,
    companyLogoUrl: candidate.companyLogoUrl,
    signalLabel: candidate.signalFact,
    personName: candidate.personName,
    whyNow: bullets[0] ?? COPY.dashboard.home.salesLeader.whyFallback,
    whyNowBullets: bullets,
    dealId: deal.dealId,
    dealTitle: deal.dealTitle,
    dealHref: ROUTES.deals.detail(deal.dealId),
    referenceId: match?.referenceId ?? null,
    referenceTitle: match?.referenceTitle ?? null,
    referenceSimilarity: match?.similarity ?? null,
    referenceHref: match?.referenceId ? ROUTES.references.detail(match.referenceId) : null,
    referencePersonMatch: match?.personMatchHint ?? false,
    accountHref: ROUTES.accountsDetail(candidate.companyId),
    matchHref: ROUTES.matchWithDeal(deal.dealId),
    tone,
    perfectReference,
  }
}

export function formatExecSignalFact(input: {
  personName: string
  companyName: string
  changeSummary: string
  insightSignalFact: string | null
  personTitleBefore: string | null
  personTitleAfter: string | null
}): string {
  const insight = input.insightSignalFact?.trim()
  if (insight) return insight
  const summary = input.changeSummary?.trim()
  if (summary) return summary
  return formatRoleChangeFact({
    personName: input.personName,
    companyName: input.companyName,
    personTitleBefore: input.personTitleBefore,
    personTitleAfter: input.personTitleAfter,
    changeSummary: summary || 'Positionswechsel',
  })
}

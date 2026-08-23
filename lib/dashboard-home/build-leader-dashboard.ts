import type { DealRow } from '@/app/(app)/deals/types'
import { COPY } from '@/lib/copy'
import {
  formatReferenceDate,
  normalizeOrgDateDisplayFormat,
  type OrgDateDisplayFormat,
} from '@/lib/format'
import type {
  LeaderCoveragePipelineRow,
  LeaderPipelineSignalRow,
  LeaderRiskDealRow,
  LeaderSignalRiskRow,
} from '@/lib/dashboard-home/dashboard-home-types'
import { ACTIVE_DEAL_STATUSES } from '@/lib/dashboard-home/dashboard-home-types'
import { ROUTES } from '@/lib/routes'

const PARTIAL_MATCH_CUTOFF = 0.47

export function buildLeaderRiskDeals(
  deals: DealRow[],
  options?: { dateDisplayFormat?: OrgDateDisplayFormat | string | null },
): LeaderRiskDealRow[] {
  const copy = COPY.dashboard.home.salesLeader
  const dateFmt = normalizeOrgDateDisplayFormat(options?.dateDisplayFormat)
  return deals
    .filter((d) => ACTIVE_DEAL_STATUSES.includes(d.status))
    .map((deal) => {
      const linked = deal.linked_refs?.length ?? 0
      const score = deal.best_match_score
      let tone: 'gap' | 'warn' | 'ok'
      let coverageLabel: string
      let ctaLabel: string | null
      if (linked === 0) {
        tone = 'gap'
        coverageLabel = copy.riskNoProof
        ctaLabel = copy.riskRequestRef
      } else if (score == null || score < PARTIAL_MATCH_CUTOFF) {
        tone = 'warn'
        coverageLabel = copy.riskPartial
        ctaLabel = copy.riskReview
      } else {
        tone = 'ok'
        coverageLabel = copy.riskStrong
        ctaLabel = null
      }
      const closeLabel = deal.expiry_date
        ? `schließt ${formatReferenceDate(deal.expiry_date, dateFmt)}`
        : null
      const subtitle = [closeLabel, coverageLabel].filter(Boolean).join(' · ')
      return {
        id: deal.id,
        title: deal.title,
        companyName: deal.company_name ?? null,
        companyLogoUrl: deal.company_logo_url ?? null,
        companyId: deal.company_id ?? null,
        subtitle,
        tone,
        ctaLabel,
        href: ROUTES.deals.detail(deal.id),
      }
    })
    .sort((a, b) => {
      const order = { gap: 0, warn: 1, ok: 2 }
      return order[a.tone] - order[b.tone]
    })
    .slice(0, 8)
}

export function buildLeaderCoveragePipeline(
  pipelineSignals: LeaderPipelineSignalRow[],
  gapTerm: string | null,
): LeaderCoveragePipelineRow[] {
  const rows: LeaderCoveragePipelineRow[] = pipelineSignals.map((s) => ({
    label: s.companyName,
    sublabel: `${s.openDealCount} Deal(s) · ${s.signalCount} Signale`,
    tone: s.signalCount >= 3 ? ('warn' as const) : ('ok' as const),
  }))
  if (gapTerm) {
    rows.unshift({
      label: gapTerm,
      sublabel: 'Suche ohne Treffer',
      tone: 'gap',
    })
  }
  return rows.slice(0, 6)
}

export function buildLeaderSignalRisks(input: {
  championLossCount: number
  unansweredTriggers: number
  totalTriggers: number
}): LeaderSignalRiskRow[] {
  const copy = COPY.dashboard.home.salesLeader
  const rows: LeaderSignalRiskRow[] = []
  if (input.championLossCount > 0) {
    rows.push({
      tone: 'gap',
      text: `${input.championLossCount} offene Deals > 1 Mio haben kürzlich ihren Champion verloren`,
      ctaLabel: copy.signalRiskIntervene,
      href: ROUTES.deals.root,
    })
  }
  if (input.unansweredTriggers > 0) {
    rows.push({
      tone: 'warn',
      text: `${input.totalTriggers} Trigger auf Ziel-Accounts — ${input.unansweredTriggers} unbeantwortet`,
      ctaLabel: copy.signalRiskPushTeam,
      href: ROUTES.accounts,
    })
  }
  return rows
}

export function buildWinRateCompare(closedDeals: DealRow[], minRequired: number) {
  const withRef = closedDeals.filter((d) => (d.linked_refs?.length ?? 0) > 0)
  const withoutRef = closedDeals.filter((d) => (d.linked_refs?.length ?? 0) === 0)
  const withWon = withRef.filter((d) => d.status === 'won').length
  const withoutWon = withoutRef.filter((d) => d.status === 'won').length
  const closedCount = closedDeals.length
  const available =
    closedCount >= minRequired && withRef.length > 0 && withoutRef.length > 0
  return {
    available,
    withReferencePercent: withRef.length
      ? Math.round((withWon / withRef.length) * 100)
      : null,
    withoutReferencePercent: withoutRef.length
      ? Math.round((withoutWon / withoutRef.length) * 100)
      : null,
    closedDealsCount: closedCount,
    minDealsRequired: minRequired,
  }
}

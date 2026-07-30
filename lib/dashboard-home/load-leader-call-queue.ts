import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { DealRow } from '@/app/dashboard/deals/types'
import { ACTIVE_DEAL_STATUSES, type LeaderCallQueueRow } from '@/lib/dashboard-home/dashboard-home-types'
import {
  buildLeaderCallQueueRow,
  formatExecSignalFact,
  pickDealForCompany,
  scoreCallCandidate,
  type LeaderCallMatchResult,
  type LeaderCallSignalCandidate,
} from '@/lib/dashboard-home/build-leader-call-queue'
import {
  isMarketSignalCallCompleted,
  isMarketSignalDismissed,
  isMarketSignalSnoozed,
  normalizeChampionPersonKey,
} from '@/lib/dashboard-home/market-signal-inbox-keys'
import { isMissingEnrichmentColumnsError } from '@/lib/market-signals/enrichment-db'
import { matchReferencesImpl } from '@/lib/references/library/match'

function parseCategory(raw: unknown): LeaderCallSignalCandidate['signalCategory'] {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'people' || v === 'finance' || v === 'strategy') return v
  return null
}

function personTokenInText(personName: string | null, haystack: string): boolean {
  if (!personName?.trim()) return false
  const parts = personName.trim().toLowerCase().split(/\s+/).filter((p) => p.length >= 3)
  const blob = haystack.toLowerCase()
  return parts.some((p) => blob.includes(p))
}

async function resolveTopReferenceMatch(args: {
  dealId: string
  companyName: string
  signalText: string
  personName: string | null
}): Promise<LeaderCallMatchResult | null> {
  const queryParts = [
    args.companyName,
    args.signalText,
    args.personName?.trim(),
  ].filter(Boolean)
  const query = queryParts.join(' · ')
  if (!query) return null

  const result = await matchReferencesImpl(query, args.dealId, { matchCount: 5 })
  if (!result.success || !result.matches?.length) return null

  const hit = result.matches[0]!
  const blob = `${hit.title} ${hit.summary ?? ''} ${hit.snippet ?? ''}`
  return {
    referenceId: hit.id,
    referenceTitle: hit.title,
    similarity: hit.similarity,
    personMatchHint: personTokenInText(args.personName, blob),
  }
}

export async function loadLeaderCallQueue(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  deals: DealRow[]
): Promise<LeaderCallQueueRow[]> {
  const activeDeals = deals.filter((d) => ACTIVE_DEAL_STATUSES.includes(d.status))
  const companyIdsWithDeals = new Set(
    activeDeals.map((d) => d.company_id).filter((id): id is string => Boolean(id))
  )
  if (companyIdsWithDeals.size === 0) return []

  const nowMs = Date.now()

  const [
    { data: favoriteRows },
    { data: championRows },
    { data: inboxRows },
    execWithEnrichment,
    newsWithEnrichment,
  ] = await Promise.all([
    supabase
      .from('companies')
      .select('id')
      .eq('organization_id', orgId)
      .eq('is_favorite', true)
      .limit(500),
    supabase
      .from('market_signal_champion_watchlist')
      .select('person_key')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(500),
    supabase
      .from('notification_inbox_reads')
      .select('notification_key')
      .eq('user_id', userId)
      .or(
        'notification_key.like.market_snooze_until:%,notification_key.like.market_irrelevant:%,notification_key.like.market_outcome:%'
      )
      .limit(800),
    supabase
      .from('market_signal_executive_events')
      .select(
        `
        id,
        person_name,
        person_title_before,
        person_title_after,
        change_summary,
        detected_at,
        company_id,
        signal_category,
        insight_signal_fact,
        insight_why_now,
        companies ( name, logo_url, organization_id )
      `
      )
      .order('detected_at', { ascending: false })
      .limit(120),
    supabase
      .from('market_signal_account_news')
      .select(
        `
        id,
        body,
        published_on,
        company_id,
        signal_category,
        insight_signal_fact,
        insight_why_now,
        companies ( name, logo_url, organization_id )
      `
      )
      .order('published_on', { ascending: false })
      .limit(120),
  ])

  let execRows = execWithEnrichment.data
  if (execWithEnrichment.error && isMissingEnrichmentColumnsError(execWithEnrichment.error.message)) {
    const fallback = await supabase
      .from('market_signal_executive_events')
      .select(
        `id, person_name, person_title_before, person_title_after, change_summary, detected_at, company_id, companies ( name, logo_url, organization_id )`
      )
      .order('detected_at', { ascending: false })
      .limit(120)
    execRows = fallback.data
  }

  let newsRows = newsWithEnrichment.data
  if (newsWithEnrichment.error && isMissingEnrichmentColumnsError(newsWithEnrichment.error.message)) {
    const fallback = await supabase
      .from('market_signal_account_news')
      .select(`id, body, published_on, company_id, companies ( name, logo_url, organization_id )`)
      .order('published_on', { ascending: false })
      .limit(120)
    newsRows = fallback.data
  }

  const followingCompanyIds = new Set(
    (favoriteRows ?? []).map((r) => String((r as { id?: string }).id ?? '')).filter(Boolean)
  )
  const championKeys = new Set(
    (championRows ?? [])
      .map((r) => normalizeChampionPersonKey((r as { person_key?: string }).person_key))
      .filter(Boolean)
  )
  const inboxKeys = (inboxRows ?? [])
    .map((r) => String((r as { notification_key?: string }).notification_key ?? ''))
    .filter(Boolean)

  const candidates: LeaderCallSignalCandidate[] = []

  for (const raw of execRows ?? []) {
    const row = raw as Record<string, unknown>
    const companyId = String(row.company_id ?? '')
    if (!companyIdsWithDeals.has(companyId)) continue

    const co = Array.isArray(row.companies)
      ? (row.companies[0] as { name?: string; logo_url?: string | null; organization_id?: string })
      : (row.companies as { name?: string; logo_url?: string | null; organization_id?: string } | null)
    if (co?.organization_id && String(co.organization_id) !== orgId) continue

    const personName = String(row.person_name ?? '').trim()
    const personKey = normalizeChampionPersonKey(personName)
    const onChampionWatchlist = personKey ? championKeys.has(personKey) : false
    const onAccountWatchlist = followingCompanyIds.has(companyId)
    if (!onChampionWatchlist && !onAccountWatchlist) continue

    const signalKey = `market_exec:${String(row.id)}`
    if (
      isMarketSignalSnoozed(inboxKeys, signalKey, nowMs) ||
      isMarketSignalDismissed(inboxKeys, signalKey) ||
      isMarketSignalCallCompleted(inboxKeys, signalKey)
    ) {
      continue
    }

    const companyName = String(co?.name ?? 'Account').trim() || 'Account'
    const detectedAt = String(row.detected_at ?? '')
    const detectedAtMs = new Date(detectedAt).getTime()

    candidates.push({
      signalKey,
      kind: 'exec',
      companyId,
      companyName,
      companyLogoUrl: (co?.logo_url as string | null) ?? null,
      personName: personName || null,
      signalFact: formatExecSignalFact({
        personName: personName || 'Führungskraft',
        companyName,
        changeSummary: String(row.change_summary ?? ''),
        insightSignalFact: (row.insight_signal_fact as string | null) ?? null,
        personTitleBefore: (row.person_title_before as string | null) ?? null,
        personTitleAfter: (row.person_title_after as string | null) ?? null,
      }),
      whyNowRaw: (row.insight_why_now as string | null) ?? null,
      detectedAtMs: Number.isFinite(detectedAtMs) ? detectedAtMs : nowMs,
      onChampionWatchlist,
      onAccountWatchlist,
      signalCategory: parseCategory(row.signal_category),
    })
  }

  for (const raw of newsRows ?? []) {
    const row = raw as Record<string, unknown>
    const companyId = String(row.company_id ?? '')
    if (!companyIdsWithDeals.has(companyId)) continue
    if (!followingCompanyIds.has(companyId)) continue

    const co = Array.isArray(row.companies)
      ? (row.companies[0] as { name?: string; logo_url?: string | null; organization_id?: string })
      : (row.companies as { name?: string; logo_url?: string | null; organization_id?: string } | null)
    if (co?.organization_id && String(co.organization_id) !== orgId) continue

    const signalKey = `market_news:${String(row.id)}`
    if (
      isMarketSignalSnoozed(inboxKeys, signalKey, nowMs) ||
      isMarketSignalDismissed(inboxKeys, signalKey) ||
      isMarketSignalCallCompleted(inboxKeys, signalKey)
    ) {
      continue
    }

    const companyName = String(co?.name ?? 'Account').trim() || 'Account'
    const publishedOn = String(row.published_on ?? '')
    const detectedAtMs = new Date(publishedOn).getTime()
    const body = String(row.body ?? '').trim()
    const fact =
      String(row.insight_signal_fact ?? '').trim() ||
      (body.length > 160 ? `${body.slice(0, 157)}…` : body) ||
      'Unternehmens-Update'

    candidates.push({
      signalKey,
      kind: 'news',
      companyId,
      companyName,
      companyLogoUrl: (co?.logo_url as string | null) ?? null,
      personName: null,
      signalFact: fact,
      whyNowRaw: (row.insight_why_now as string | null) ?? null,
      detectedAtMs: Number.isFinite(detectedAtMs) ? detectedAtMs : nowMs,
      onChampionWatchlist: false,
      onAccountWatchlist: true,
      signalCategory: parseCategory(row.signal_category),
    })
  }

  const scored: Array<{
    candidate: LeaderCallSignalCandidate
    deal: NonNullable<ReturnType<typeof pickDealForCompany>>
    score: number
  }> = []

  for (const candidate of candidates) {
    const deal = pickDealForCompany(activeDeals, candidate.companyId)
    if (!deal) continue
    const score = scoreCallCandidate(candidate, deal, null, nowMs)
    if (score < 0) continue
    scored.push({ candidate, deal, score })
  }

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, 8)

  const rows: LeaderCallQueueRow[] = []
  for (const entry of top) {
    if (rows.length >= 5) break
    const match = await resolveTopReferenceMatch({
      dealId: entry.deal.dealId,
      companyName: entry.candidate.companyName,
      signalText: entry.candidate.signalFact,
      personName: entry.candidate.personName,
    })
    const withMatchScore = scoreCallCandidate(entry.candidate, entry.deal, match, nowMs)
    if (withMatchScore < 0) continue
    rows.push(
      buildLeaderCallQueueRow({
        candidate: entry.candidate,
        deal: entry.deal,
        match,
      })
    )
  }

  return rows
}

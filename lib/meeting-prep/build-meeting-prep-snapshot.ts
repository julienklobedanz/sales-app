import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { ACTIVE_DEAL_STATUSES } from '@/lib/dashboard-home/dashboard-home-types'
import { escapeIlikePattern } from '@/lib/match/lexical-reference-match'
import { matchReferencesImpl } from '@/lib/references/library/match'
import {
  accountHref,
  buildTalkingPoints,
  dealHref,
  extractNewsRiskRows,
  MEETING_PREP_SNAPSHOT_VERSION,
  referenceHref,
  type CompanySearchHit,
  type MeetingPrepSnapshot,
} from '@/lib/meeting-prep/meeting-prep-types'
import { isMissingEnrichmentColumnsError } from '@/lib/market-signals/enrichment-db'
import { formatRoleChangeFact } from '@/lib/market-signals/signal-intelligence'

export async function searchCompaniesForMeetingPrep(
  supabase: SupabaseClient,
  orgId: string,
  query: string,
): Promise<CompanySearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const likePat = `%${escapeIlikePattern(q)}%`
  const { data } = await supabase
    .from('companies')
    .select('id, name, logo_url')
    .eq('organization_id', orgId)
    .ilike('name', likePat)
    .order('name')
    .limit(8)
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? '—'),
    logoUrl: (row.logo_url as string | null) ?? null,
  }))
}

export async function buildMeetingPrepSnapshot(
  supabase: SupabaseClient,
  orgId: string,
  input: {
    companyId: string | null
    companyName: string
    companyLogoUrl?: string | null
    nameQuery: string
  },
): Promise<MeetingPrepSnapshot> {
  const companyId = input.companyId
  const companyName = input.companyName.trim() || input.nameQuery.trim() || 'Account'

  let deals: MeetingPrepSnapshot['deals'] = []
  if (companyId) {
    const { data: dealRows } = await supabase
      .from('deals')
      .select('id, title, status, company_id')
      .eq('organization_id', orgId)
      .eq('company_id', companyId)
      .limit(20)
    const dealIds = (dealRows ?? []).map((d) => String(d.id))
    const linkedByDeal = new Map<string, number>()
    if (dealIds.length) {
      const { data: links } = await supabase
        .from('deal_references')
        .select('deal_id')
        .in('deal_id', dealIds)
      for (const row of links ?? []) {
        const id = String((row as { deal_id?: string }).deal_id ?? '')
        if (id) linkedByDeal.set(id, (linkedByDeal.get(id) ?? 0) + 1)
      }
    }
    deals = (dealRows ?? [])
      .filter((d) =>
        ACTIVE_DEAL_STATUSES.includes(
          String(d.status) as (typeof ACTIVE_DEAL_STATUSES)[number],
        ),
      )
      .map((d) => ({
        id: String(d.id),
        title: String(d.title ?? 'Deal'),
        status: String(d.status ?? 'open'),
        linkedCount: linkedByDeal.get(String(d.id)) ?? 0,
        href: dealHref(String(d.id)),
      }))
  }

  const primaryDealId = deals[0]?.id ?? null

  const signals: MeetingPrepSnapshot['signals'] = []
  const newsForRisk: Array<{
    id: string
    body: string
    publishedOn: string
    insightFact?: string | null
  }> = []

  if (companyId) {
    const execRes = await supabase
      .from('market_signal_executive_events')
      .select(
        'id, person_name, change_summary, detected_at, person_title_after, insight_signal_fact, companies(name)',
      )
      .eq('company_id', companyId)
      .order('detected_at', { ascending: false })
      .limit(8)

    let execRows: Record<string, unknown>[] | null = (execRes.data ?? []) as Record<
      string,
      unknown
    >[]
    if (execRes.error && isMissingEnrichmentColumnsError(execRes.error.message)) {
      const fallback = await supabase
        .from('market_signal_executive_events')
        .select(
          'id, person_name, change_summary, detected_at, person_title_after, companies(name)',
        )
        .eq('company_id', companyId)
        .order('detected_at', { ascending: false })
        .limit(8)
      execRows = (fallback.data ?? []) as Record<string, unknown>[]
    }

    for (const raw of execRows ?? []) {
      const row = raw as Record<string, unknown>
      const personName = String(row.person_name ?? '').trim()
      const co = Array.isArray(row.companies)
        ? (row.companies[0] as { name?: string } | undefined)
        : (row.companies as { name?: string } | null)
      const label =
        String(row.insight_signal_fact ?? '').trim() ||
        formatRoleChangeFact({
          personName: personName || 'Führungskraft',
          companyName: String(co?.name ?? companyName),
          personTitleAfter: (row.person_title_after as string | null) ?? null,
          changeSummary: String(row.change_summary ?? ''),
        })
      signals.push({
        id: String(row.id),
        kind: 'exec',
        label,
        dateIso: String(row.detected_at ?? ''),
        signalKey: `market_exec:${String(row.id)}`,
      })
    }

    const newsRes = await supabase
      .from('market_signal_account_news')
      .select('id, body, published_on, insight_signal_fact')
      .eq('company_id', companyId)
      .order('published_on', { ascending: false })
      .limit(12)

    for (const raw of newsRes.data ?? []) {
      const row = raw as Record<string, unknown>
      const body = String(row.body ?? '')
      const publishedOn = String(row.published_on ?? '')
      const insightFact = (row.insight_signal_fact as string | null) ?? null
      newsForRisk.push({ id: String(row.id), body, publishedOn, insightFact })
      if (signals.length < 10) {
        const label =
          insightFact?.trim() ||
          (body.length > 120 ? `${body.slice(0, 117)}…` : body) ||
          'Unternehmens-Update'
        signals.push({
          id: String(row.id),
          kind: 'news',
          label,
          dateIso: publishedOn,
          signalKey: `market_news:${String(row.id)}`,
        })
      }
    }
  }

  const newsRisks = extractNewsRiskRows(newsForRisk)

  const matchQuery = [
    companyName,
    ...signals.slice(0, 3).map((s) => s.label),
    ...newsRisks.slice(0, 2).map((n) => n.headline),
  ].join(' · ')

  const matchResult = await matchReferencesImpl(matchQuery, primaryDealId, {
    matchCount: 5,
  })
  const references: MeetingPrepSnapshot['references'] =
    matchResult.success && matchResult.matches.length
      ? matchResult.matches.slice(0, 3).map((hit) => ({
          id: hit.id,
          title: hit.title,
          similarity: hit.similarity,
          snippet: hit.snippet ?? null,
          href: referenceHref(hit.id),
        }))
      : []

  const signalReferencePairs: MeetingPrepSnapshot['signalReferencePairs'] = []
  for (const sig of signals.slice(0, 4)) {
    const pairMatch = await matchReferencesImpl(
      `${companyName} ${sig.label}`,
      primaryDealId,
      {
        matchCount: 1,
      },
    )
    const hit = pairMatch.success ? pairMatch.matches[0] : undefined
    if (!hit) continue
    signalReferencePairs.push({
      signalLabel: sig.label,
      referenceTitle: hit.title,
      referenceId: hit.id,
      similarity: hit.similarity,
    })
  }

  const talkingPoints = buildTalkingPoints({
    companyName,
    hasDeals: deals.length > 0,
    signals,
    newsRisks,
    references,
  })

  return {
    version: MEETING_PREP_SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    company: {
      id: companyId,
      name: companyName,
      logoUrl: input.companyLogoUrl ?? null,
      accountHref: companyId ? accountHref(companyId) : null,
    },
    deals,
    signals: signals.slice(0, 8),
    newsRisks,
    references,
    signalReferencePairs,
    talkingPoints,
  }
}

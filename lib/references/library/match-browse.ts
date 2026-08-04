import { createServerSupabaseClient } from '@/lib/supabase/server'
import { snippetFromSummary } from '@/lib/match/match-reference-snippet'
import { fetchCompanyFieldsForReferenceIds } from '@/lib/references/enrich-match-hits-company'
import { logReferenceMatched } from '@/lib/events/log-reference-matched'
import { log } from '@/lib/observability/logger'
import { RPC_SALES_VISIBLE_REFERENCE_STATUSES } from '@/lib/roles/reference-visibility-scope'
import {
  applyClientSideStructuralFilters,
  BROWSE_SIMILARITY_SENTINEL,
} from '@/lib/match/match-hit-helpers'
import type {
  MatchReferenceHit,
  MatchReferencesOptions,
  MatchReferencesResult,
} from '@/lib/match/match-types'
import type { Database } from '@/lib/database.types'

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>

export async function browseRecentReferences(
  supabase: Supabase,
  params: {
    orgId: string
    salesVisibleOnly: boolean
    matchCount: number
    filters?: MatchReferencesOptions['filters']
    dealId: string | null
  },
): Promise<MatchReferencesResult> {
  const { orgId, salesVisibleOnly, matchCount, filters, dealId } = params
  const start = performance.now()
  const needsClientOr =
    Boolean(filters?.volumeBands && filters.volumeBands.length > 1) ||
    Boolean(filters?.monthsBackList && filters.monthsBackList.length > 1) ||
    Boolean(filters?.volumeBands?.length) ||
    Boolean(filters?.monthsBackList?.length) ||
    Boolean(filters?.excludeCreatedYears?.length) ||
    Boolean(filters?.excludeCreatedYears?.length) ||
    Boolean(filters?.excludeIndustries?.length) ||
    Boolean(filters?.excludeTerms?.length) ||
    typeof filters?.minVolume === 'number' ||
    typeof filters?.maxVolume === 'number'
  const fetchLimit = Math.min(
    Math.max(needsClientOr ? matchCount * 4 : matchCount, 1),
    80,
  )

  let q = supabase
    .from('references')
    .select(
      'id, title, summary, industry, volume_eur, status, created_at, project_start, project_end, company_id',
    )
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(fetchLimit)

  if (salesVisibleOnly) {
    q = q.in('status', [...RPC_SALES_VISIBLE_REFERENCE_STATUSES])
  }

  const f = filters
  if (f?.industries?.length) {
    q = q.in('industry', f.industries)
  }
  if (f?.statuses?.length) {
    q = q.in('status', f.statuses as Database['public']['Enums']['reference_status'][])
  }
  // Nur einzelnes Aktualitäts-Fenster serverseitig; Mehrfach = Client-AND.
  if (!f?.monthsBackList?.length || f.monthsBackList.length === 1) {
    if (f?.createdAfter) {
      q = q.gte('created_at', f.createdAfter)
    }
    if (f?.createdBefore) {
      q = q.lt('created_at', f.createdBefore)
    }
  }

  const { data, error } = await q
  if (error) {
    return { success: false, error: error.message }
  }

  const rows = data ?? []

  let matches: MatchReferenceHit[] = rows.map((r) => {
    const summary = typeof r.summary === 'string' ? r.summary.trim() || null : null
    const title = typeof r.title === 'string' ? r.title : ''
    const volRaw = typeof r.volume_eur === 'string' ? r.volume_eur.trim() : null
    return {
      id: String(r.id),
      title,
      summary,
      industry: typeof r.industry === 'string' ? r.industry : null,
      similarity: BROWSE_SIMILARITY_SENTINEL,
      snippet: snippetFromSummary(summary, title),
      companyName: null,
      volumeEur: volRaw && volRaw.length > 0 ? volRaw : null,
      status: typeof r.status === 'string' ? r.status : null,
      createdAt: typeof r.created_at === 'string' ? r.created_at : null,
      projectStart: typeof r.project_start === 'string' ? r.project_start : null,
      projectEnd: typeof r.project_end === 'string' ? r.project_end : null,
    }
  })

  matches = applyClientSideStructuralFilters(matches, filters).slice(0, matchCount)

  if (matches.length > 0) {
    const companyByRef = await fetchCompanyFieldsForReferenceIds(
      supabase,
      matches.map((m) => m.id),
    )
    matches = matches.map((m) => {
      const co = companyByRef.get(m.id)
      if (!co) return m
      return {
        ...m,
        companyId: co.companyId,
        companyName: m.companyName ?? co.companyName,
        companyLogoUrl: co.companyLogoUrl,
      }
    })
  }

  const totalMs = Math.round(performance.now() - start)
  log.info('match.browse', {
    label: 'match.browse',
    ms: totalMs,
    organizationId: orgId,
    resultCount: matches.length,
  })

  void logReferenceMatched({
    organizationId: orgId,
    matchedReferenceIds: matches.map((m) => m.id),
    source: dealId ? 'deal_context' : 'match_page',
    dealId,
    rerank: false,
    matchThreshold: 0,
    durationMs: totalMs,
  })

  return { success: true, matches }
}

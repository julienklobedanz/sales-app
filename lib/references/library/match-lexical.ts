import { createServerSupabaseClient } from '@/lib/supabase/server'
import { snippetFromSummary } from '@/lib/match/match-reference-snippet'
import { fetchCompanyFieldsForReferenceIds } from '@/lib/references/enrich-match-hits-company'
import { RPC_SALES_VISIBLE_REFERENCE_STATUSES } from '@/lib/roles/reference-visibility-scope'
import {
  escapeIlikePattern,
  lexicalSearchNeedles,
  scoreLexicalReferenceMatch,
} from '@/lib/match/lexical-reference-match'
import {
  applyClientSideStructuralFilters,
  sortMatchesBySimilarityDesc,
} from '@/lib/match/match-hit-helpers'
import type { MatchReferenceHit, MatchReferencesOptions } from '@/lib/match/match-types'
import type { Database } from '@/lib/database.types'

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>

export async function fetchLexicalReferenceHits(
  supabase: Supabase,
  params: {
    orgId: string
    query: string
    salesVisibleOnly: boolean
    matchCount: number
    filters?: MatchReferencesOptions['filters']
  },
): Promise<MatchReferenceHit[]> {
  const needle = params.query.trim()
  if (needle.length < 2) return []

  const needles = lexicalSearchNeedles(needle)
  if (!needles.length) return []

  type RefRow = {
    id: string
    title: string
    summary: string | null
    industry: string | null
    volume_eur: string | null
    status: string | null
    created_at: string | null
    project_start: string | null
    project_end: string | null
    company_id: string
  }

  const selectCols =
    'id, title, summary, industry, volume_eur, status, created_at, project_start, project_end, company_id'

  function baseRefQuery() {
    let q = supabase
      .from('references')
      .select(selectCols)
      .eq('organization_id', params.orgId)
      .is('deleted_at', null)
      .limit(params.matchCount)

    if (params.salesVisibleOnly) {
      q = q.in('status', [...RPC_SALES_VISIBLE_REFERENCE_STATUSES])
    }
    const f = params.filters
    if (f?.industries?.length) {
      q = q.in('industry', f.industries)
    }
    if (f?.statuses?.length) {
      q = q.in('status', f.statuses as Database['public']['Enums']['reference_status'][])
    }
    if (f?.createdAfter) {
      q = q.gte('created_at', f.createdAfter)
    }
    if (f?.createdBefore) {
      q = q.lt('created_at', f.createdBefore)
    }
    return q
  }

  const companyNameById = new Map<string, string>()
  const rowMap = new Map<string, RefRow>()

  // Pro Nadel: Company-Name + Titel + Summary (Teilbegriff wie „passagier“).
  await Promise.all(
    needles.map(async (n) => {
      const pattern = `%${escapeIlikePattern(n)}%`

      const [{ data: companies }, byTitle, bySummary] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name')
          .eq('organization_id', params.orgId)
          .ilike('name', pattern)
          .limit(30),
        baseRefQuery().ilike('title', pattern),
        baseRefQuery().ilike('summary', pattern),
      ])

      for (const c of companies ?? []) {
        companyNameById.set(c.id, c.name)
      }

      const companyIds = (companies ?? []).map((c) => c.id)
      if (companyIds.length > 0) {
        const byCompany = await baseRefQuery().in('company_id', companyIds)
        for (const row of (byCompany.data ?? []) as RefRow[]) {
          rowMap.set(row.id, row)
        }
      }

      for (const row of [
        ...((byTitle.data ?? []) as RefRow[]),
        ...((bySummary.data ?? []) as RefRow[]),
      ]) {
        rowMap.set(row.id, row)
      }
    }),
  )

  if (rowMap.size === 0) return []

  const companyByRef = await fetchCompanyFieldsForReferenceIds(supabase, [
    ...rowMap.keys(),
  ])

  let hits: MatchReferenceHit[] = []
  for (const row of rowMap.values()) {
    const co = companyByRef.get(row.id)
    const companyName = companyNameById.get(row.company_id) ?? co?.companyName ?? null
    const score = scoreLexicalReferenceMatch(needle, companyName, row.title, row.summary)
    if (score == null) continue
    const summary = row.summary?.trim() ?? null
    hits.push({
      id: row.id,
      title: row.title ?? '',
      summary,
      industry: row.industry ?? null,
      similarity: score,
      snippet: snippetFromSummary(summary, row.title ?? ''),
      companyName,
      companyId: co?.companyId ?? row.company_id,
      companyLogoUrl: co?.companyLogoUrl,
      volumeEur: row.volume_eur?.trim() || null,
      status: row.status ?? null,
      createdAt: row.created_at ?? null,
      projectStart: row.project_start ?? null,
      projectEnd: row.project_end ?? null,
    })
  }

  hits = applyClientSideStructuralFilters(hits, params.filters)
  return sortMatchesBySimilarityDesc(hits).slice(0, params.matchCount)
}

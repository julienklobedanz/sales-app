import { createServerSupabaseClient } from '@/lib/supabase/server'
import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { resolveIndustryId } from '@/lib/constants/industries'
import type { Tables } from '@/lib/supabase/db-types'
import type { CompanyRefRow, RecommendedReference } from './account-action-types'

function normalizeTags(tags: string | null | undefined): Set<string> {
  if (!tags || !tags.trim()) return new Set()
  return new Set(
    tags
      .split(',')
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string): t is string => Boolean(t)),
  )
}

function normalizeIndustry(s: string | null | undefined): string {
  return resolveIndustryId(s)
}

/** Region/Country aus HQ-String oder Land extrahieren (normalisiert für Vergleich) */
function normalizeRegion(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Ähnliches Kundenprofil: gleiche Region (Land) oder HQ enthält Referenz-Land */
function sizeRegionMatch(
  companyHeadquarters: string | null | undefined,
  refCountry: string | null | undefined,
): boolean {
  const hq = normalizeRegion(companyHeadquarters)
  const country = normalizeRegion(refCountry)
  if (!hq && !country) return false
  if (!country) return false
  return hq.includes(country) || country.includes(hq) || hq === country
}

type RefMatchRow = Pick<
  Tables<'references'>,
  'id' | 'title' | 'industry' | 'tags' | 'country' | 'created_at'
> & {
  companies: unknown
}

function companyNameFromJoin(companies: unknown): string | null {
  return accountFromJoin(companies)?.name || null
}

function toCompanyRefRow(
  row: Pick<
    Tables<'references'>,
    'id' | 'title' | 'status' | 'project_status' | 'industry' | 'country' | 'created_at'
  >,
): CompanyRefRow {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    project_status: row.project_status,
    industry: row.industry,
    country: row.country,
    created_at: row.created_at ?? '',
  }
}

function scoreReferenceMatches(
  refRows: RefMatchRow[],
  opts: {
    companyIndustry: string
    companyHeadquarters: string | null
    projectTagSet: Set<string>
    limit: number
  },
): RecommendedReference[] {
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const scored: {
    ref: RefMatchRow
    matchType: RecommendedReference['matchType']
    score: number
    matchReasons: RecommendedReference['matchReasons']
  }[] = []

  for (const r of refRows) {
    const refIndustry = normalizeIndustry(r.industry)
    const refTagSet = normalizeTags(r.tags)
    const industryMatch = !!opts.companyIndustry && opts.companyIndustry === refIndustry
    const tagMatch =
      opts.projectTagSet.size > 0 &&
      refTagSet.size > 0 &&
      [...opts.projectTagSet].some((t: string) => refTagSet.has(t))
    const sizeRegion = sizeRegionMatch(opts.companyHeadquarters, r.country)

    let points = (industryMatch ? 50 : 0) + (tagMatch ? 30 : 0) + (sizeRegion ? 20 : 0)
    if (points === 0) continue

    if (r.created_at && new Date(r.created_at) >= twelveMonthsAgo) {
      points = Math.min(100, points + 10)
    }

    let matchType: RecommendedReference['matchType'] = 'industry_only'
    if (industryMatch && tagMatch) matchType = 'industry_and_tags'
    else if (tagMatch) matchType = 'tags_only'
    else if (industryMatch) matchType = 'industry_only'

    scored.push({
      ref: r,
      matchType,
      score: points,
      matchReasons: { industry: industryMatch, tags: tagMatch, sizeRegion },
    })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, opts.limit).map(({ ref, matchType, score, matchReasons }) => ({
    id: ref.id,
    title: ref.title ?? '',
    company_name: companyNameFromJoin(ref.companies),
    matchType,
    score,
    matchReasons,
  }))
}

/** Smart-Matching: Top 3 Referenzen nach Score 0–100 (Branche 50, Themen 30, Größe/Region 20) */
export async function getRecommendedReferencesImpl(
  projectId: string,
): Promise<RecommendedReference[]> {
  const supabase = await createServerSupabaseClient()
  const { data: project } = await supabase
    .from('company_roadmap_projects')
    .select('company_id, tags')
    .eq('id', projectId)
    .single()
  if (!project?.company_id) return []
  const projectCompanyId = project.company_id

  const { data: company } = await supabase
    .from('companies')
    .select('industry, headquarters')
    .eq('id', projectCompanyId)
    .single()
  const companyIndustry = normalizeIndustry(company?.industry ?? null)
  const companyHeadquarters = company?.headquarters ?? null
  const projectTagSet = normalizeTags(project.tags ?? null)

  const { data: refRows } = await supabase
    .from('references')
    .select('id, title, industry, tags, country, created_at, companies(name)')
    .is('deleted_at', null)

  if (!refRows?.length) return []

  return scoreReferenceMatches(refRows, {
    companyIndustry,
    companyHeadquarters,
    projectTagSet,
    limit: 3,
  })
}

/** Alle Referenzen der Org für Fallback "alle Referenzen anzeigen" (z. B. Top 10) */
export async function getReferencesForOrgImpl(
  limit = 10,
): Promise<RecommendedReference[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('references')
    .select('id, title, companies(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (!data?.length) return []
  return data.map((r) => ({
    id: r.id,
    title: r.title ?? '',
    company_name: companyNameFromJoin(r.companies),
    matchType: 'industry_only' as const,
    score: 0,
    matchReasons: { industry: false, tags: false, sizeRegion: false },
  }))
}

export async function getReferencesByCompanyIdImpl(
  companyId: string,
): Promise<CompanyRefRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('references')
    .select('id, title, status, project_status, industry, country, created_at')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return (data ?? []).map(toCompanyRefRow)
}

/** Smart Match für Account: Referenzen aus der Org, die zu diesem Kunden passen (Branche/Herausforderungen). */
export async function getRecommendedReferencesForAccountImpl(
  companyId: string,
): Promise<RecommendedReference[]> {
  const supabase = await createServerSupabaseClient()
  const { data: company } = await supabase
    .from('companies')
    .select('industry, headquarters')
    .eq('id', companyId)
    .single()
  const { data: strategy } = await supabase
    .from('company_strategies')
    // main_goals -> company_goals
    .select('company_goals:main_goals')
    .eq('company_id', companyId)
    .maybeSingle()
  const companyIndustry = normalizeIndustry(company?.industry ?? null)
  const goalsTags: string[] = (strategy?.company_goals ?? '')
    .split(/[\s,;]+/)
    .map((t: string) => t.trim().toLowerCase())
    .filter((t: string): t is string => Boolean(t))
  const projectTagSet = new Set<string>(goalsTags)
  const companyHeadquarters = company?.headquarters ?? null

  const { data: refRows } = await supabase
    .from('references')
    .select('id, title, industry, tags, country, created_at, companies(name)')
    .is('deleted_at', null)
    .neq('company_id', companyId)

  if (!refRows?.length) return []

  return scoreReferenceMatches(refRows, {
    companyIndustry,
    companyHeadquarters,
    projectTagSet,
    limit: 5,
  })
}

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resolveIndustryId } from '@/lib/constants/industries'
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

  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const refCountry = (r: (typeof refRows)[0]) => (r.country as string | null) ?? null
  const companyName = (r: (typeof refRows)[0]) => {
    const c = r.companies
    if (Array.isArray(c) && c.length > 0) return (c[0] as { name?: string }).name ?? null
    return (c as { name?: string } | null)?.name ?? null
  }

  const scored: {
    ref: (typeof refRows)[0]
    matchType: RecommendedReference['matchType']
    score: number
    matchReasons: RecommendedReference['matchReasons']
  }[] = []

  for (const r of refRows) {
    const refIndustry = normalizeIndustry(r.industry as string | null)
    const refTagSet = normalizeTags(r.tags as string | null)
    const industryMatch = !!companyIndustry && companyIndustry === refIndustry
    const tagMatch =
      projectTagSet.size > 0 &&
      refTagSet.size > 0 &&
      [...projectTagSet].some((t: string) => refTagSet.has(t))
    const sizeRegion = sizeRegionMatch(companyHeadquarters, refCountry(r))

    let points = (industryMatch ? 50 : 0) + (tagMatch ? 30 : 0) + (sizeRegion ? 20 : 0)
    if (points === 0) continue

    const createdAt = r.created_at as string | null | undefined
    if (createdAt && new Date(createdAt) >= twelveMonthsAgo) {
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
  const top = scored.slice(0, 3)

  return top.map(({ ref, matchType, score, matchReasons }) => ({
    id: ref.id,
    title: (ref.title as string) ?? '',
    company_name: companyName(ref),
    matchType,
    score,
    matchReasons,
  }))
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
  const companyName = (r: (typeof data)[0]) => {
    const c = r.companies
    if (Array.isArray(c) && c.length > 0) return (c[0] as { name?: string }).name ?? null
    return (c as { name?: string } | null)?.name ?? null
  }
  return data.map((r) => ({
    id: r.id,
    title: (r.title as string) ?? '',
    company_name: companyName(r),
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
  return (data ?? []) as CompanyRefRow[]
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
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const refCountry = (r: (typeof refRows)[0]) => (r.country as string | null) ?? null
  const companyName = (r: (typeof refRows)[0]) => {
    const c = r.companies
    if (Array.isArray(c) && c.length > 0) return (c[0] as { name?: string }).name ?? null
    return (c as { name?: string } | null)?.name ?? null
  }
  const scored: {
    ref: (typeof refRows)[0]
    matchType: RecommendedReference['matchType']
    score: number
    matchReasons: RecommendedReference['matchReasons']
  }[] = []
  for (const r of refRows) {
    const refIndustry = normalizeIndustry(r.industry as string | null)
    const refTagSet = normalizeTags(r.tags as string | null)
    const industryMatch = !!companyIndustry && companyIndustry === refIndustry
    const tagMatch =
      projectTagSet.size > 0 &&
      refTagSet.size > 0 &&
      [...projectTagSet].some((t: string) => refTagSet.has(t))
    const sizeRegion = sizeRegionMatch(companyHeadquarters, refCountry(r))
    let points = (industryMatch ? 50 : 0) + (tagMatch ? 30 : 0) + (sizeRegion ? 20 : 0)
    if (points === 0) continue
    const createdAt = r.created_at as string | null | undefined
    if (createdAt && new Date(createdAt) >= twelveMonthsAgo)
      points = Math.min(100, points + 10)
    let matchType: RecommendedReference['matchType'] = 'industry_only'
    if (industryMatch && tagMatch) matchType = 'industry_and_tags'
    else if (tagMatch) matchType = 'tags_only'
    scored.push({
      ref: r,
      matchType,
      score: points,
      matchReasons: { industry: industryMatch, tags: tagMatch, sizeRegion },
    })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 5).map(({ ref, matchType, score, matchReasons }) => ({
    id: ref.id,
    title: (ref.title as string) ?? '',
    company_name: companyName(ref),
    matchType,
    score,
    matchReasons,
  }))
}

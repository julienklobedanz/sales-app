'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type CompanyStrategyRow = {
  id: string
  company_id: string
  company_goals: string | null
  red_flags: string | null
  competition: string | null
  next_steps: string | null
  updated_at: string | null
}

export type StakeholderRole =
  | 'economic_buyer'
  | 'champion'
  | 'blocker'
  | 'technical_buyer'
  | 'user_buyer'

export type StakeholderRow = {
  id: string
  company_id: string
  name: string
  title: string | null
  role: StakeholderRole
  created_at: string
  updated_at: string | null
}

export type CompanyRefRow = {
  id: string
  title: string
  status: string
  project_status: string | null
  created_at: string
}

/** Opportunity Roadmap: ein Projekt pro Zeile */
export type RoadmapProjectRow = {
  id: string
  company_id: string
  project_name: string
  estimated_value: string | null
  status: string | null
  target_date: string | null
  tags: string | null
  created_at: string
  updated_at: string | null
}

/** Empfohlene Referenz für Smart-Matching inkl. Score 0–100 und Begründung */
export type RecommendedReference = {
  id: string
  title: string
  company_name: string | null
  matchType: 'industry_and_tags' | 'tags_only' | 'industry_only'
  /** Score 0–100 (Branche 50, Themen 30, Größe/Region 20) */
  score: number
  /** Für Tooltip: Warum dieses Match? */
  matchReasons: { industry: boolean; tags: boolean; sizeRegion: boolean }
}

export async function getCompanyStrategy(
  companyId: string
): Promise<CompanyStrategyRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('company_strategies')
    .select('id, company_id, company_goals, red_flags, competition, next_steps, updated_at')
    .eq('company_id', companyId)
    .maybeSingle()
  return data as CompanyStrategyRow | null
}

export async function upsertCompanyStrategy(
  companyId: string,
  payload: {
    company_goals?: string | null
    red_flags?: string | null
    competition?: string | null
    next_steps?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('company_strategies').upsert(
    {
      company_id: companyId,
      company_goals: payload.company_goals ?? null,
      red_flags: payload.red_flags ?? null,
      competition: payload.competition ?? null,
      next_steps: payload.next_steps ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id' }
  )
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/companies')
  revalidatePath(`/dashboard/companies/${companyId}`)
  return { success: true }
}

export async function getRoadmapProjects(companyId: string): Promise<RoadmapProjectRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('company_roadmap_projects')
    .select('*')
    .eq('company_id', companyId)
    .order('target_date', { ascending: true, nullsFirst: false })
  return (data ?? []) as RoadmapProjectRow[]
}

export async function upsertRoadmapProject(
  companyId: string,
  payload: {
    id?: string
    project_name: string
    estimated_value?: string | null
    status?: string | null
    target_date?: string | null
    tags?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const row = {
    company_id: companyId,
    project_name: payload.project_name.trim(),
    estimated_value: payload.estimated_value?.trim() || null,
    status: payload.status?.trim() || null,
    target_date: payload.target_date || null,
    tags: payload.tags?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  if (payload.id) {
    const { error } = await supabase
      .from('company_roadmap_projects')
      .update(row)
      .eq('id', payload.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('company_roadmap_projects').insert(row)
    if (error) return { success: false, error: error.message }
  }
  revalidatePath(`/dashboard/companies/${companyId}`)
  return { success: true }
}

export async function deleteRoadmapProject(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('company_roadmap_projects')
    .select('company_id')
    .eq('id', id)
    .single()
  const { error } = await supabase.from('company_roadmap_projects').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(`/dashboard/companies/${row.company_id}`)
  return { success: true }
}

function normalizeTags(tags: string | null | undefined): Set<string> {
  if (!tags || !tags.trim()) return new Set()
  return new Set(
    tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  )
}

function normalizeIndustry(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

/** Region/Country aus HQ-String oder Land extrahieren (normalisiert für Vergleich) */
function normalizeRegion(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Ähnliches Kundenprofil: gleiche Region (Land) oder HQ enthält Referenz-Land */
function sizeRegionMatch(
  companyHeadquarters: string | null | undefined,
  refCountry: string | null | undefined
): boolean {
  const hq = normalizeRegion(companyHeadquarters)
  const country = normalizeRegion(refCountry)
  if (!hq && !country) return false
  if (!country) return false
  return hq.includes(country) || country.includes(hq) || hq === country
}

/** Smart-Matching: Top 3 Referenzen nach Score 0–100 (Branche 50, Themen 30, Größe/Region 20) */
export async function getRecommendedReferences(
  projectId: string
): Promise<RecommendedReference[]> {
  const supabase = await createServerSupabaseClient()
  const { data: project } = await supabase
    .from('company_roadmap_projects')
    .select('company_id, tags')
    .eq('id', projectId)
    .single()
  if (!project?.company_id) return []

  const { data: company } = await supabase
    .from('companies')
    .select('industry, headquarters')
    .eq('id', project.company_id)
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
      [...projectTagSet].some((t) => refTagSet.has(t))
    const sizeRegion = sizeRegionMatch(companyHeadquarters, refCountry(r))

    let points =
      (industryMatch ? 50 : 0) + (tagMatch ? 30 : 0) + (sizeRegion ? 20 : 0)
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
export async function getReferencesForOrg(limit = 10): Promise<RecommendedReference[]> {
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

export async function getStakeholders(companyId: string): Promise<StakeholderRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('stakeholders')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
  return (data ?? []) as StakeholderRow[]
}

export async function createStakeholder(
  companyId: string,
  payload: { name: string; title?: string | null; role: StakeholderRole }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('stakeholders').insert({
    company_id: companyId,
    name: payload.name.trim(),
    title: payload.title?.trim() || null,
    role: payload.role,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/dashboard/companies/${companyId}`)
  return { success: true }
}

export async function updateStakeholder(
  id: string,
  payload: { name?: string; title?: string | null; role?: StakeholderRole }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('stakeholders')
    .select('company_id')
    .eq('id', id)
    .single()
  const { error } = await supabase
    .from('stakeholders')
    .update({
      ...(payload.name !== undefined && { name: payload.name.trim() }),
      ...(payload.title !== undefined && { title: payload.title?.trim() || null }),
      ...(payload.role !== undefined && { role: payload.role }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(`/dashboard/companies/${row.company_id}`)
  return { success: true }
}

export async function deleteStakeholder(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('stakeholders')
    .select('company_id')
    .eq('id', id)
    .single()
  const { error } = await supabase.from('stakeholders').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(`/dashboard/companies/${row.company_id}`)
  return { success: true }
}

export async function getReferencesByCompanyId(
  companyId: string
): Promise<CompanyRefRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('references')
    .select('id, title, status, project_status, created_at')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return (data ?? []) as CompanyRefRow[]
}

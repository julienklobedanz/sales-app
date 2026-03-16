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
  value_proposition?: string | null
  updated_at: string | null
}

export type StakeholderRole =
  | 'economic_buyer'
  | 'champion'
  | 'blocker'
  | 'technical_buyer'
  | 'user_buyer'
  | 'unknown'

export type StakeholderRow = {
  id: string
  company_id: string
  name: string
  title: string | null
  role: StakeholderRole
  linkedin_url?: string | null
  priorities_topics?: string | null
  last_contact_at?: string | null
  sentiment?: string | null
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
    // DB-Spalten: main_goals, competitive_situation; wir mappen per Alias auf unsere Feldnamen
    .select(
      'id, company_id, company_goals:main_goals, red_flags, competition:competitive_situation, next_steps, updated_at'
    )
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
    // value_proposition wird aktuell nicht in allen Deployments als Spalte geführt;
    // wir akzeptieren es im Payload für Vorwärtskompatibilität, mappen es aber nicht zwingend auf die DB.
    value_proposition?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('company_strategies').upsert(
    {
      company_id: companyId,
      // DB-Spalten heißen main_goals und competitive_situation
      main_goals: payload.company_goals ?? null,
      red_flags: payload.red_flags ?? null,
      competitive_situation: payload.competition ?? null,
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
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string): t is string => Boolean(t))
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
      [...projectTagSet].some((t: string) => refTagSet.has(t))
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
  payload: {
    name: string
    title?: string | null
    role: StakeholderRole
    linkedin_url?: string | null
    priorities_topics?: string | null
    last_contact_at?: string | null
    sentiment?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('stakeholders').insert({
    company_id: companyId,
    name: payload.name.trim(),
    title: payload.title?.trim() || null,
    role: payload.role,
    linkedin_url: payload.linkedin_url?.trim() || null,
    priorities_topics: payload.priorities_topics?.trim() || null,
    last_contact_at: payload.last_contact_at || null,
    sentiment: payload.sentiment?.trim() || null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/dashboard/companies/${companyId}`)
  return { success: true }
}

export async function updateStakeholder(
  id: string,
  payload: {
    name?: string
    title?: string | null
    role?: StakeholderRole
    linkedin_url?: string | null
    priorities_topics?: string | null
    last_contact_at?: string | null
    sentiment?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('stakeholders')
    .select('company_id')
    .eq('id', id)
    .single()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (payload.name !== undefined) update.name = payload.name.trim()
  if (payload.title !== undefined) update.title = payload.title?.trim() || null
  if (payload.role !== undefined) update.role = payload.role
  if (payload.linkedin_url !== undefined) update.linkedin_url = payload.linkedin_url?.trim() || null
  if (payload.priorities_topics !== undefined) update.priorities_topics = payload.priorities_topics?.trim() || null
  if (payload.last_contact_at !== undefined) update.last_contact_at = payload.last_contact_at || null
  if (payload.sentiment !== undefined) update.sentiment = payload.sentiment?.trim() || null
  const { error } = await supabase.from('stakeholders').update(update).eq('id', id)
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

/** Expiring Deals für einen Account (Market Signals Tab). */
export type DealSignalRow = {
  id: string
  title: string
  expiry_date: string | null
  volume: string | null
  incumbent_provider: string | null
  status: string
}
export async function getExpiringDealsByCompanyId(
  companyId: string
): Promise<DealSignalRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return []
  const now = new Date()
  const in180 = new Date(now)
  in180.setDate(in180.getDate() + 180)
  const { data } = await supabase
    .from('deals')
    .select('id, title, expiry_date, volume, incumbent_provider, status')
    .eq('company_id', companyId)
    .eq('organization_id', orgId)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', in180.toISOString().slice(0, 10))
    .order('expiry_date', { ascending: true })
  return (data ?? []) as DealSignalRow[]
}

export async function updateCompanyAccountStatus(
  companyId: string,
  account_status: 'at_risk' | 'warmup' | 'expansion' | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('companies')
    .update({ account_status } as { account_status: string | null })
    .eq('id', companyId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/companies')
  revalidatePath(`/dashboard/companies/${companyId}`)
  return { success: true }
}

export async function deleteCompanyWithData(
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()

  // Optional: weitere abhängige Daten explizit löschen, falls kein ON DELETE CASCADE konfiguriert ist.
  // Referenzen
  await supabase.from('references').delete().eq('company_id', companyId)
  // Deals
  await supabase.from('deals').delete().eq('company_id', companyId)
  // Strategy
  await supabase.from('company_strategies').delete().eq('company_id', companyId)
  // Roadmap-Projekte
  await supabase.from('company_roadmap_projects').delete().eq('company_id', companyId)
  // Stakeholder
  await supabase.from('stakeholders').delete().eq('company_id', companyId)

  const { error } = await supabase.from('companies').delete().eq('id', companyId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/companies')
  return { success: true }
}

/** Smart Match für Account: Referenzen aus der Org, die zu diesem Kunden passen (Branche/Herausforderungen). */
export async function getRecommendedReferencesForAccount(
  companyId: string
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
  const companyIndustry = (company?.industry ?? '').trim().toLowerCase()
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
    const refIndustry = (r.industry as string ?? '').trim().toLowerCase()
    const refTagSet = normalizeTags(r.tags as string | null)
    const industryMatch = !!companyIndustry && companyIndustry === refIndustry
    const tagMatch =
      projectTagSet.size > 0 &&
      refTagSet.size > 0 &&
      [...projectTagSet].some((t: string) => refTagSet.has(t))
    const sizeRegion = sizeRegionMatch(companyHeadquarters, refCountry(r))
    let points =
      (industryMatch ? 50 : 0) + (tagMatch ? 30 : 0) + (sizeRegion ? 20 : 0)
    if (points === 0) continue
    const createdAt = r.created_at as string | null | undefined
    if (createdAt && new Date(createdAt) >= twelveMonthsAgo) points = Math.min(100, points + 10)
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

/** One-Pager HTML für Druck/PDF: Strategy + Stakeholder-Prioritäten + Referenzen. */
export async function generateOnePagerHtml(
  companyId: string
): Promise<{ success: boolean; html?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const [
    { data: company },
    { data: strategy },
    { data: stakeholders },
    refs,
  ] = await Promise.all([
    supabase.from('companies').select('name, industry').eq('id', companyId).single(),
    // main_goals -> company_goals; value_proposition existiert evtl. nicht in allen Deployments, daher hier nicht selektieren
    supabase.from('company_strategies').select('company_goals:main_goals, red_flags, next_steps').eq('company_id', companyId).maybeSingle(),
    supabase.from('stakeholders').select('name, title, role, priorities_topics').eq('company_id', companyId),
    getReferencesByCompanyId(companyId),
  ])
  if (!company) return { success: false, error: 'Unternehmen nicht gefunden.' }
  const goals = strategy?.company_goals ?? ''
  const challenges = strategy?.red_flags ?? ''
  const valueProp = (strategy as { value_proposition?: string | null } | null)?.value_proposition ?? ''
  const nextSteps = strategy?.next_steps ?? ''
  type StakeholderData = { name: string; title?: string | null; role: string; priorities_topics?: string | null }
  const stakeholderList: StakeholderData[] = stakeholders ?? []
  const execSummary = stakeholderList.map((s: StakeholderData) => `${s.name}${s.title ? ` (${s.title})` : ''}: ${(s.priorities_topics ?? '').trim() || '—'}`).join('\n')
  const refList = refs.map((r: CompanyRefRow) => r.title).join(', ') || '—'
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>One-Pager ${escapeHtml(company.name)}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.5;} h1{font-size:1.5rem;} h2{font-size:1.1rem;margin-top:1.5rem;} ul{margin:0.25rem 0;} .meta{color:#666;font-size:0.9rem;}</style></head><body>
<h1>${escapeHtml(company.name)}</h1>
<p class="meta">${escapeHtml(company.industry ?? '')}</p>
<h2>Unternehmensziele</h2>
<p>${escapeHtml(goals) || '—'}</p>
<h2>Value Proposition (Warum gewinnen wir hier?)</h2>
<p>${escapeHtml(valueProp) || '—'}</p>
<h2>Herausforderungen / Red Flags</h2>
<p>${escapeHtml(challenges) || '—'}</p>
<h2>Entscheider & Prioritäten</h2>
<pre style="white-space:pre-wrap;font-size:0.9rem;">${escapeHtml(execSummary) || '—'}</pre>
<h2>Nächste Schritte</h2>
<p>${escapeHtml(nextSteps) || '—'}</p>
<h2>Referenzen / Proof Points</h2>
<p>${escapeHtml(refList)}</p>
<p class="meta" style="margin-top:2rem;">Erstellt mit Client Intelligence · ${new Date().toLocaleDateString('de-DE')}</p>
</body></html>`
  return { success: true, html }
}
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}


'use server'

import { revalidatePath } from 'next/cache'
import { ROUTES } from '@/lib/routes'
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
  influence_level?: string | null
  attitude?: string | null
  notes?: string | null
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
  revalidatePath(ROUTES.accounts)
  revalidatePath(ROUTES.accountsDetail(companyId))
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
  revalidatePath(ROUTES.accountsDetail(companyId))
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
  if (row?.company_id) revalidatePath(ROUTES.accountsDetail(row.company_id))
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
    influence_level?: string | null
    attitude?: string | null
    notes?: string | null
    linkedin_url?: string | null
    priorities_topics?: string | null
    last_contact_at?: string | null
    sentiment?: string | null
  }
): Promise<{ success: boolean; stakeholder?: StakeholderRow; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('stakeholders')
    .insert({
      company_id: companyId,
      name: payload.name.trim(),
      title: payload.title?.trim() || null,
      role: payload.role,
      influence_level: payload.influence_level?.trim() || null,
      attitude: payload.attitude?.trim() || null,
      notes: payload.notes?.trim() || null,
      linkedin_url: payload.linkedin_url?.trim() || null,
      priorities_topics: payload.priorities_topics?.trim() || null,
      last_contact_at: payload.last_contact_at || null,
      sentiment: payload.sentiment?.trim() || null,
    })
    .select('*')
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true, stakeholder: data as StakeholderRow }
}

export async function updateStakeholder(
  id: string,
  payload: {
    name?: string
    title?: string | null
    role?: StakeholderRole
    influence_level?: string | null
    attitude?: string | null
    notes?: string | null
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
  if (payload.influence_level !== undefined) update.influence_level = payload.influence_level?.trim() || null
  if (payload.attitude !== undefined) update.attitude = payload.attitude?.trim() || null
  if (payload.notes !== undefined) update.notes = payload.notes?.trim() || null
  if (payload.linkedin_url !== undefined) update.linkedin_url = payload.linkedin_url?.trim() || null
  if (payload.priorities_topics !== undefined) update.priorities_topics = payload.priorities_topics?.trim() || null
  if (payload.last_contact_at !== undefined) update.last_contact_at = payload.last_contact_at || null
  if (payload.sentiment !== undefined) update.sentiment = payload.sentiment?.trim() || null
  const { error } = await supabase.from('stakeholders').update(update).eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(ROUTES.accountsDetail(row.company_id))
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
  if (row?.company_id) revalidatePath(ROUTES.accountsDetail(row.company_id))
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

export type ContactPersonRow = {
  id: string
  company_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone?: string | null
  linkedin_url?: string | null
  role?: string | null
  position?: string | null
  avatar_url?: string | null
  created_at: string
  updated_at: string | null
}

export async function getContactsByCompanyId(companyId: string): Promise<ContactPersonRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('contact_persons')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
  if (error && (error.message ?? '').includes('company_id')) {
    // DB noch ohne company_id-Spalte → keine Kontakte im Account-Detail anzeigen
    return []
  }
  return (data ?? []) as ContactPersonRow[]
}

export async function createContactPerson(
  companyId: string,
  payload: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    linkedin_url?: string | null
    role?: string | null
    position?: string | null
  }
): Promise<{ success: boolean; contact?: ContactPersonRow; error?: string }> {
  const supabase = await createServerSupabaseClient()
  // Einige Deployments verlangen organization_id auf contact_persons.
  const [{ data: company }, { data: profile }] = await Promise.all([
    supabase.from('companies').select('organization_id').eq('id', companyId).single(),
    supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single(),
  ])
  const organization_id =
    (company as { organization_id?: string | null } | null)?.organization_id ??
    (profile as { organization_id?: string | null } | null)?.organization_id ??
    null

  const insertRow: Record<string, unknown> = {
    company_id: companyId,
    first_name: payload.first_name?.trim() || null,
    last_name: payload.last_name?.trim() || null,
    email: payload.email?.trim().toLowerCase() || null,
    phone: payload.phone?.trim() || null,
    linkedin_url: payload.linkedin_url?.trim() || null,
    role: payload.role?.trim() || null,
    position: payload.position?.trim() || null,
  }
  if (organization_id) insertRow.organization_id = organization_id

  const { data, error } = await supabase
    .from('contact_persons')
    .insert(insertRow)
    .select('*')
    .single()
  if (error) {
    if ((error.message ?? '').includes('company_id')) {
      return {
        success: false,
        error:
          "Kontakte können noch nicht einem Account zugeordnet werden, weil die Spalte 'contact_persons.company_id' in deiner DB fehlt. Bitte Migration ausführen und Schema-Cache refreshen.",
      }
    }
    return { success: false, error: error.message }
  }
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true, contact: data as ContactPersonRow }
}

export async function updateContactPerson(
  id: string,
  payload: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    linkedin_url?: string | null
    role?: string | null
    position?: string | null
    company_id?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('contact_persons')
    .select('company_id')
    .eq('id', id)
    .single()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (payload.first_name !== undefined) update.first_name = payload.first_name?.trim() || null
  if (payload.last_name !== undefined) update.last_name = payload.last_name?.trim() || null
  if (payload.email !== undefined) update.email = payload.email?.trim().toLowerCase() || null
  if (payload.phone !== undefined) update.phone = payload.phone?.trim() || null
  if (payload.linkedin_url !== undefined) update.linkedin_url = payload.linkedin_url?.trim() || null
  if (payload.role !== undefined) update.role = payload.role?.trim() || null
  if (payload.position !== undefined) update.position = payload.position?.trim() || null
  if (payload.company_id !== undefined) update.company_id = payload.company_id || null
  const { error } = await supabase.from('contact_persons').update(update).eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(ROUTES.accountsDetail(row.company_id))
  return { success: true }
}

export async function deleteContactPerson(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('contact_persons')
    .select('company_id')
    .eq('id', id)
    .single()
  const { error } = await supabase.from('contact_persons').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(ROUTES.accountsDetail(row.company_id))
  return { success: true }
}

export type AccountDealRow = {
  id: string
  title: string
  volume: string | null
  status: string
  expiry_date: string | null
  created_at: string
  updated_at: string | null
}

export async function getActiveDealsByCompanyId(companyId: string): Promise<AccountDealRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return []

  const { data } = await supabase
    .from('deals')
    .select('id, title, volume, status, expiry_date, created_at, updated_at')
    .eq('organization_id', orgId)
    .eq('company_id', companyId)
    .not('status', 'in', '("won","lost")')
    .order('updated_at', { ascending: false, nullsFirst: false })
  return (data ?? []) as AccountDealRow[]
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

/** Setzt nur `account_status`. Stammdaten inkl. Status: {@link updateCompany}. */
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
  revalidatePath(ROUTES.accounts)
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true }
}

export async function toggleCompanyFavorite(
  companyId: string,
  isFavorite: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('companies')
    .update({ is_favorite: isFavorite })
    .eq('id', companyId)
  if (error) {
    if ((error.message ?? '').includes('is_favorite')) {
      return {
        success: false,
        error:
          "Favoriten sind in deiner DB noch nicht aktiviert (Spalte 'companies.is_favorite' fehlt). Bitte Migration ausführen und Schema-Cache refreshen.",
      }
    }
    return { success: false, error: error.message }
  }
  revalidatePath(ROUTES.accounts)
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true }
}

type RefreshAccountsResult =
  | {
      success: true
      updatedCount: number
      skippedCount: number
      failedCount: number
      updatedNames: string[]
      skippedNames: string[]
      failedNames: string[]
    }
  | { success: false; error: string }

function normalizeDomain(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

function inputToDomain(input: string | null | undefined): string | null {
  const s = String(input ?? '').trim()
  if (!s) return null
  const normalized = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const host = new URL(normalized).hostname
    const d = normalizeDomain(host)
    return d.includes('.') ? d : null
  } catch {
    const d = normalizeDomain(s)
    return d.includes('.') ? d : null
  }
}

type BrandfetchPayload = {
  companyName: string | null
  websiteUrl: string | null
  logoUrl: string | null
  industry: string | null
  headquarters: string | null
  employeeCount: number | null
  description: string | null
}

async function fetchBrandfetchCompany(domain: string): Promise<{ success: true; data: BrandfetchPayload } | { success: false }> {
  const apiKey = process.env.BRANDFETCH_API_KEY
  if (!apiKey) return { success: false }

  let res: Response
  try {
    res = await fetch(`https://api.brandfetch.io/v2/brands/domain/${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    })
  } catch {
    return { success: false }
  }
  if (!res.ok) return { success: false }

  let json: {
    name?: string | null
    brand?: string | null
    domain?: string | null
    description?: string | null
    company?: {
      employees?: number | null
      industries?: { name?: string | null }[]
      location?: { city?: string | null; country?: string | null }
    }
    logos?: { formats?: { src?: string | null }[] }[]
  }
  try {
    json = await res.json()
  } catch {
    return { success: false }
  }

  const rawName = String(json.name ?? json.brand ?? '').trim()
  const location = json.company?.location
  const logoUrl =
    json.logos?.[0]?.formats?.[0]?.src ??
    json.logos?.find((logo) => logo.formats?.length)?.formats?.[0]?.src ??
    null
  const websiteDomain = String(json.domain ?? domain).trim()
  const data: BrandfetchPayload = {
    companyName: rawName || null,
    websiteUrl: websiteDomain ? `https://${normalizeDomain(websiteDomain)}` : `https://${domain}`,
    logoUrl: logoUrl || null,
    industry: String(json.company?.industries?.[0]?.name ?? '').trim() || null,
    headquarters: [location?.city, location?.country].filter(Boolean).join(', ') || null,
    employeeCount: typeof json.company?.employees === 'number' ? json.company.employees : null,
    description: String(json.description ?? '').trim() || null,
  }
  return { success: true, data }
}

export async function refreshAccountsFromBrandfetch(): Promise<RefreshAccountsResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht eingeloggt.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) return { success: false, error: 'Onboarding unvollständig.' }
  if (profile.role === 'sales') return { success: false, error: 'Keine Berechtigung.' }

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id,name,website_url,logo_url,industry,headquarters,employee_count,description')
    .eq('organization_id', profile.organization_id)
    .order('name')
  if (error) return { success: false, error: error.message }

  let updatedCount = 0
  let skippedCount = 0
  let failedCount = 0
  const updatedNames: string[] = []
  const skippedNames: string[] = []
  const failedNames: string[] = []

  for (const company of companies ?? []) {
    const website = String(company.website_url ?? '').trim()
    const domain = inputToDomain(website)
    if (!domain) {
      skippedCount += 1
      skippedNames.push(String(company.name ?? 'Unbekannt'))
      continue
    }

    const fetched = await fetchBrandfetchCompany(domain)
    if (!fetched.success) {
      failedCount += 1
      failedNames.push(String(company.name ?? 'Unbekannt'))
      continue
    }

    const hasMissingData =
      !company.logo_url ||
      !company.industry ||
      !company.headquarters ||
      company.employee_count == null ||
      !company.description
    if (!hasMissingData) {
      skippedCount += 1
      skippedNames.push(String(company.name ?? 'Unbekannt'))
      continue
    }

    const payload = {
      logo_url: company.logo_url || fetched.data.logoUrl,
      industry: company.industry || fetched.data.industry,
      headquarters: company.headquarters || fetched.data.headquarters,
      employee_count: company.employee_count ?? fetched.data.employeeCount,
      description: company.description || fetched.data.description,
      website_url: website || fetched.data.websiteUrl,
      name: String(company.name ?? '').trim() || fetched.data.companyName || 'Unbekannt',
      updated_at: new Date().toISOString(),
    }
    const { error: updateError } = await supabase.from('companies').update(payload).eq('id', company.id)
    if (updateError) {
      failedCount += 1
      failedNames.push(String(company.name ?? 'Unbekannt'))
      continue
    }
    updatedCount += 1
    updatedNames.push(payload.name)
  }

  revalidatePath(ROUTES.accounts)
  return {
    success: true,
    updatedCount,
    skippedCount,
    failedCount,
    updatedNames,
    skippedNames,
    failedNames,
  }
}

export async function createCompany(payload: {
  name: string
  website_url?: string | null
  industry?: string | null
  headquarters?: string | null
  logo_url?: string | null
  employee_count?: number | null
  description?: string | null
  account_status?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht eingeloggt.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) return { success: false, error: 'Onboarding unvollständig.' }
  if (profile.role === 'sales') return { success: false, error: 'Keine Berechtigung.' }

  const name = payload.name.trim()
  if (!name) return { success: false, error: 'Name ist erforderlich.' }

  const { data, error } = await supabase
    .from('companies')
    .insert({
      organization_id: profile.organization_id,
      name,
      website_url: payload.website_url?.trim() || null,
      industry: payload.industry?.trim() || null,
      headquarters: payload.headquarters?.trim() || null,
      logo_url: payload.logo_url?.trim() || null,
      employee_count: payload.employee_count ?? null,
      description: payload.description?.trim() || null,
      account_status: payload.account_status?.trim() || null,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.accounts)
  return { success: true, id: data?.id }
}

const COMPANY_ACCOUNT_STATUSES = ['at_risk', 'warmup', 'expansion'] as const
export type CompanyAccountStatusValue = (typeof COMPANY_ACCOUNT_STATUSES)[number]

export async function updateCompany(payload: {
  id: string
  name: string
  website_url?: string | null
  industry?: string | null
  headquarters?: string | null
  logo_url?: string | null
  employee_count?: number | null
  description?: string | null
  account_status?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht eingeloggt.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) return { success: false, error: 'Onboarding unvollständig.' }
  if (profile.role === 'sales') return { success: false, error: 'Keine Berechtigung.' }

  const name = payload.name.trim()
  if (!name) return { success: false, error: 'Name ist erforderlich.' }

  const statusRaw = payload.account_status?.trim() || null
  const account_status =
    statusRaw && COMPANY_ACCOUNT_STATUSES.includes(statusRaw as CompanyAccountStatusValue)
      ? statusRaw
      : null

  const { data: row, error: fetchError } = await supabase
    .from('companies')
    .select('id, organization_id')
    .eq('id', payload.id)
    .single()

  if (fetchError || !row) return { success: false, error: 'Account nicht gefunden.' }
  if (row.organization_id !== profile.organization_id) {
    return { success: false, error: 'Keine Berechtigung.' }
  }

  const { error } = await supabase
    .from('companies')
    .update({
      name,
      website_url: payload.website_url?.trim() || null,
      industry: payload.industry?.trim() || null,
      headquarters: payload.headquarters?.trim() || null,
      logo_url: payload.logo_url?.trim() || null,
      employee_count: payload.employee_count ?? null,
      description: payload.description?.trim() || null,
      account_status,
    })
    .eq('id', payload.id)
    .eq('organization_id', profile.organization_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.accounts)
  revalidatePath(ROUTES.accountsDetail(payload.id))
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

  revalidatePath(ROUTES.accounts)
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


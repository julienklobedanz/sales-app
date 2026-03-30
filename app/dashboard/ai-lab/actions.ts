'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { extractRequirementsFromPdf, matchRequirementsToReferences } from './services/rfp-extract-service'
import { fetchCompanyNewsSignals } from './services/news-service'
import { generateExecutiveBriefing } from './services/linkedin-service'

export type AlertRow = {
  id: string
  organization_id: string
  title: string
  body: string | null
  alert_type: string
  company_id: string | null
  source_url: string | null
  created_at: string
  company_name?: string | null
}

export type ExecutiveBriefingRow = {
  id: string
  company_id: string
  stakeholder_id: string | null
  name: string
  linkedin_url: string | null
  summary: string | null
  top_priorities: string | null
  red_flags: string | null
  created_at: string
}

export type RfpAnalysisRow = {
  id: string
  company_id: string | null
  source_file_name: string | null
  extracted_requirements: unknown
  matched_reference_ids: string[]
  created_at: string
}

export async function getAlerts(limit = 20): Promise<AlertRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  if (!profile?.organization_id) return []

  const { data } = await supabase
    .from('high_impact_alerts')
    .select(`
      id,
      organization_id,
      title,
      body,
      alert_type,
      company_id,
      source_url,
      created_at,
      companies(name)
    `)
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    organization_id: r.organization_id,
    title: r.title,
    body: r.body,
    alert_type: r.alert_type,
    company_id: r.company_id,
    source_url: r.source_url,
    created_at: r.created_at,
    company_name: (r.companies as { name?: string } | null)?.name ?? null,
  })) as AlertRow[]
}

export async function getUnreadAlertCount(): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return 0

  const { data: alerts } = await supabase
    .from('high_impact_alerts')
    .select('id')
    .eq('organization_id', orgId)
  const ids = (alerts ?? []).map((a) => a.id)
  if (ids.length === 0) return 0

  const { data: read } = await supabase
    .from('alert_reads')
    .select('alert_id')
    .eq('user_id', user.id)
    .in('alert_id', ids)
  return ids.length - (read?.length ?? 0)
}

/** Unread alert counts by type (for card badges). */
export async function getUnreadAlertsByType(): Promise<{ execMovement: number; companyNews: number }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { execMovement: 0, companyNews: 0 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return { execMovement: 0, companyNews: 0 }

  const { data: alerts } = await supabase
    .from('high_impact_alerts')
    .select('id, alert_type')
    .eq('organization_id', orgId)
  const ids = (alerts ?? []).map((a) => a.id)
  if (ids.length === 0) return { execMovement: 0, companyNews: 0 }

  const { data: read } = await supabase
    .from('alert_reads')
    .select('alert_id')
    .eq('user_id', user.id)
    .in('alert_id', ids)
  const readSet = new Set((read ?? []).map((r) => r.alert_id))
  const unread = (alerts ?? []).filter((a) => !readSet.has(a.id))
  return {
    execMovement: unread.filter((a) => (a as { alert_type?: string }).alert_type === 'exec_move').length,
    companyNews: unread.filter((a) => (a as { alert_type?: string }).alert_type === 'company_news').length,
  }
}

export async function markAlertsRead(alertIds: string[]): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || alertIds.length === 0) return

  await supabase.from('alert_reads').upsert(
    alertIds.map((alert_id) => ({ user_id: user.id, alert_id })),
    { onConflict: 'user_id,alert_id' }
  )
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/ai-lab')
}

export async function createAlert(payload: {
  title: string
  body?: string | null
  alert_type: string
  company_id?: string | null
  source_url?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  if (!profile?.organization_id) return { success: false, error: 'Nicht angemeldet' }

  const { error } = await supabase.from('high_impact_alerts').insert({
    organization_id: profile.organization_id,
    title: payload.title,
    body: payload.body ?? null,
    alert_type: payload.alert_type,
    company_id: payload.company_id ?? null,
    source_url: payload.source_url ?? null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/ai-lab')
  return { success: true }
}

export async function saveExecutiveBriefing(payload: {
  company_id: string
  stakeholder_id?: string | null
  name: string
  linkedin_url?: string | null
  summary: string
  top_priorities: string
  red_flags: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('executive_briefings').insert({
    company_id: payload.company_id,
    stakeholder_id: payload.stakeholder_id ?? null,
    name: payload.name,
    linkedin_url: payload.linkedin_url ?? null,
    summary: payload.summary,
    top_priorities: payload.top_priorities,
    red_flags: payload.red_flags,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/dashboard/accounts/${payload.company_id}`)
  revalidatePath('/dashboard/ai-lab')
  return { success: true }
}

export async function getExecutiveBriefingsForCompany(companyId: string): Promise<ExecutiveBriefingRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('executive_briefings')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ExecutiveBriefingRow[]
}

export async function saveRfpAnalysis(payload: {
  company_id?: string | null
  source_file_name?: string | null
  extracted_requirements: unknown
  matched_reference_ids: string[]
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  if (!profile?.organization_id) return { success: false, error: 'Nicht angemeldet' }

  const { data: row, error } = await supabase
    .from('rfp_analysis')
    .insert({
      organization_id: profile.organization_id,
      company_id: payload.company_id ?? null,
      source_file_name: payload.source_file_name ?? null,
      extracted_requirements: payload.extracted_requirements ?? [],
      matched_reference_ids: payload.matched_reference_ids ?? [],
    })
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/ai-lab')
  if (payload.company_id) revalidatePath(`/dashboard/accounts/${payload.company_id}`)
  return { success: true, id: row?.id }
}

export async function getRfpAnalysisForCompany(companyId: string): Promise<RfpAnalysisRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('rfp_analysis')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  return (data ?? []).map((r) => ({
    ...r,
    matched_reference_ids: r.matched_reference_ids ?? [],
  })) as RfpAnalysisRow[]
}

export async function getRfpAnalysisForOrg(): Promise<(RfpAnalysisRow & { company_name?: string | null })[]> {
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  if (!profile?.organization_id) return []

  const { data } = await supabase
    .from('rfp_analysis')
    .select('*, companies(name)')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    company_name: (r.companies as { name?: string } | null)?.name ?? null,
    matched_reference_ids: r.matched_reference_ids ?? [],
  })) as (RfpAnalysisRow & { company_name?: string | null })[]
}

/** Reference list for RFP matching (id, title, industry, tags) – nur Referenzen aus Companies der Org. */
export async function getReferencesForRfpMatch(limit = 50): Promise<{ id: string; title: string; industry?: string | null; tags?: string | null }[]> {
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single()
  if (!profile?.organization_id) return []

  const { data: companyIds } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', profile.organization_id)
  const ids = (companyIds ?? []).map((c) => c.id)
  if (ids.length === 0) return []

  const { data } = await supabase
    .from('references')
    .select('id, title, industry, tags')
    .is('deleted_at', null)
    .in('company_id', ids)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as { id: string; title: string; industry?: string | null; tags?: string | null }[]
}

/** Run RFP analysis: extract from PDF, match to references, persist. */
export async function runRfpAnalysis(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { success: false, error: 'Bitte eine PDF-Datei auswählen.' }
  const companyId = (formData.get('company_id') as string) || null

  const requirements = await extractRequirementsFromPdf(file)
  const refs = await getReferencesForRfpMatch(50)
  const refIds = refs.map((r) => r.id)
  const { matchedIds, matchSnippets } = await matchRequirementsToReferences(
    requirements,
    refIds,
    refs
  )

  const result = await saveRfpAnalysis({
    company_id: companyId || undefined,
    source_file_name: file.name,
    extracted_requirements: requirements,
    matched_reference_ids: matchedIds,
  })
  return result.success ? { success: true } : { success: false, error: result.error }
}

/** Simulated company news (später: echte News-API). */
export async function getCompanyNews(
  companies: { id: string; name: string }[]
): Promise<{ companyId: string; companyName: string; topBullets: string[]; items: { id: string; title: string; summary: string; sourceUrl: string; sourceName: string; publishedAt: string }[] }[]> {
  return fetchCompanyNewsSignals(companies)
}

/** Generate executive briefing (simulated; später: LinkedIn/Web-API). */
export async function generateBriefing(name: string, linkedInUrl: string | null): Promise<
  { success: true; summary: string; topPriorities: string; redFlags: string } | { success: false; error: string }
> {
  try {
    const r = await generateExecutiveBriefing(name, linkedInUrl)
    return { success: true, ...r }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unbekannter Fehler' }
  }
}

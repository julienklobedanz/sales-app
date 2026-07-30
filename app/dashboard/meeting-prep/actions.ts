'use server'

import { revalidatePath } from 'next/cache'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import { ROUTES } from '@/lib/routes'
import {
  buildMeetingPrepSnapshot,
  searchCompaniesForMeetingPrep,
} from '@/lib/meeting-prep/build-meeting-prep-snapshot'
import type {
  CompanySearchHit,
  MeetingPrepSessionListItem,
  MeetingPrepSnapshot,
} from '@/lib/meeting-prep/meeting-prep-types'

async function requireOrgUser(): Promise<
  { user: { id: string }; orgId: string } | { error: string }
> {
  const user = await getRequestUser()
  if (!user) return { error: 'Nicht angemeldet.' }
  const profile = await getRequestProfile()
  const orgId = profile?.organization_id
  if (!orgId) return { error: 'Keine Organisation.' }
  return { user: { id: user.id }, orgId }
}

export async function searchMeetingPrepCompaniesAction(
  query: string
): Promise<{ hits: CompanySearchHit[] } | { error: string }> {
  const auth = await requireOrgUser()
  if ('error' in auth) return { error: auth.error }
  const supabase = await createServerSupabaseClient()
  const hits = await searchCompaniesForMeetingPrep(supabase, auth.orgId, query)
  return { hits }
}

export type CreateMeetingPrepResult =
  | {
      success: true
      sessionId: string
      snapshot: MeetingPrepSnapshot
    }
  | { success: false; error: string; disambiguation?: CompanySearchHit[] }

export async function createMeetingPrepSessionAction(input: {
  query: string
  companyId?: string | null
}): Promise<CreateMeetingPrepResult> {
  const auth = await requireOrgUser()
  if ('error' in auth) return { success: false, error: auth.error }

  const query = String(input.query ?? '').trim()
  if (!query) return { success: false, error: 'Bitte einen Firmennamen eingeben.' }

  const supabase = await createServerSupabaseClient()
  let companyId = input.companyId?.trim() || null
  let companyName = query
  let companyLogoUrl: string | null = null

  if (!companyId) {
    const hits = await searchCompaniesForMeetingPrep(supabase, auth.orgId, query)
    if (hits.length === 0) {
      companyName = query
    } else if (hits.length === 1) {
      companyId = hits[0]!.id
      companyName = hits[0]!.name
      companyLogoUrl = hits[0]!.logoUrl
    } else {
      const exact = hits.find((h) => h.name.toLowerCase() === query.toLowerCase())
      if (exact) {
        companyId = exact.id
        companyName = exact.name
        companyLogoUrl = exact.logoUrl
      } else {
        return { success: false, error: 'Mehrere Accounts passen — bitte auswählen.', disambiguation: hits }
      }
    }
  } else {
    const { data: co } = await supabase
      .from('companies')
      .select('id, name, logo_url')
      .eq('id', companyId)
      .eq('organization_id', auth.orgId)
      .maybeSingle()
    if (!co) return { success: false, error: 'Account nicht gefunden.' }
    companyName = String(co.name ?? query)
    companyLogoUrl = (co.logo_url as string | null) ?? null
  }

  const snapshot = await buildMeetingPrepSnapshot(supabase, auth.orgId, {
    companyId,
    companyName,
    companyLogoUrl,
    nameQuery: query,
  })

  const title = companyName
  const { data: inserted, error } = await supabase
    .from('sales_meeting_prep_sessions')
    .insert({
      organization_id: auth.orgId,
      created_by: auth.user.id,
      company_id: companyId,
      company_name_query: query,
      title,
      snapshot: snapshot as unknown as import('@/lib/database.types').Json,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.home)
  return { success: true, sessionId: String(inserted.id), snapshot }
}

export async function loadMeetingPrepSessionAction(
  sessionId: string
): Promise<{ snapshot: MeetingPrepSnapshot; title: string } | { error: string }> {
  const auth = await requireOrgUser()
  if ('error' in auth) return { error: auth.error }
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('sales_meeting_prep_sessions')
    .select('title, snapshot')
    .eq('id', sessionId)
    .eq('organization_id', auth.orgId)
    .eq('created_by', auth.user.id)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Session nicht gefunden.' }
  return {
    title: String(data.title ?? 'Meeting Prep'),
    snapshot: data.snapshot as unknown as MeetingPrepSnapshot,
  }
}

export async function listMeetingPrepSessionsForDashboard(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orgId: string,
  userId: string
): Promise<MeetingPrepSessionListItem[]> {
  const { data } = await supabase
    .from('sales_meeting_prep_sessions')
    .select('id, title, company_id, company_name_query, created_at, companies(logo_url)')
    .eq('organization_id', orgId)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  return (data ?? []).map((row) => {
    const co = Array.isArray(row.companies)
      ? (row.companies[0] as { logo_url?: string | null } | undefined)
      : (row.companies as { logo_url?: string | null } | null)
    return {
      id: String(row.id),
      title: String(row.title ?? row.company_name_query ?? 'Meeting'),
      companyId: row.company_id ? String(row.company_id) : null,
      companyNameQuery: String(row.company_name_query ?? ''),
      createdAt: String(row.created_at ?? ''),
      companyLogoUrl: (co?.logo_url as string | null) ?? null,
    }
  })
}

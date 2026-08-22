'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile, getRequestUser } from '@/lib/auth/request-user'
import {
  buildMeetingPrepSnapshot,
  searchCompaniesForMeetingPrep,
} from '@/lib/meeting-prep/build-meeting-prep-snapshot'
import type {
  CompanySearchHit,
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

export type CreateMeetingPrepResult =
  | {
      success: true
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
        return {
          success: false,
          error: 'Mehrere Accounts passen — bitte auswählen.',
          disambiguation: hits,
        }
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

  return { success: true, snapshot }
}

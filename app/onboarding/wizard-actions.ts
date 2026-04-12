'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { extractDataFromDocument } from '@/lib/document-extraction'
import { inviteByEmail } from '@/app/dashboard/settings/invite-actions'

export type FinalizeWorkspaceResult =
  | { success: true }
  | { success: false; error: string }

export async function finalizeWorkspaceAndProfile(params: {
  inviteToken: string | null
  organizationName: string
  logoDataUrl: string | null
  role: 'sales' | 'account_manager' | 'admin' | null
}): Promise<FinalizeWorkspaceResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const tokenFromCookie = (await cookies()).get('invite_token')?.value?.trim() || null
  const inviteToken = params.inviteToken?.trim() || tokenFromCookie

  // Invite: Organisation und Rolle aus Token (Rolle wird bei E-Mail-Einladung gesetzt)
  let organizationId: string | null = null
  let joinedViaInvite = false
  let inviteRole: 'sales' | 'account_manager' | 'admin' = 'sales'
  if (inviteToken) {
    const { data } = await supabase.rpc('get_invite_by_token', { invite_token: inviteToken })
    const parsed = data as { organization_id?: string; role?: string | null } | null
    if (parsed?.organization_id) {
      organizationId = parsed.organization_id
      joinedViaInvite = true
      const r = parsed.role
      if (r === 'admin' || r === 'sales' || r === 'account_manager') {
        inviteRole = r
      }
      ;(await cookies()).set('invite_token', '', { path: '/', maxAge: 0 })
    }
  }

  // Kein Invite: org anlegen
  if (!organizationId) {
    const name = params.organizationName.trim()
    if (!name) return { success: false, error: 'Bitte Arbeitsbereich-Namen eingeben.' }
    const { data: newOrgId, error: orgError } = await supabase.rpc('create_organization', {
      org_name: name,
    })
    if (orgError || !newOrgId) {
      console.error(orgError)
      return { success: false, error: 'Fehler beim Anlegen des Arbeitsbereichs.' }
    }
    organizationId = newOrgId as string

    // Logo direkt in organizations.logo_url (Data URL), wie in Settings-Action
    if (params.logoDataUrl) {
      await supabase
        .from('organizations')
        .update({ logo_url: params.logoDataUrl, updated_at: new Date().toISOString() })
        .eq('id', organizationId)
    }
  }

  const chosenRole =
    params.role === 'admin' || params.role === 'sales' || params.role === 'account_manager'
      ? params.role
      : null

  if (!joinedViaInvite && !chosenRole) {
    return { success: false, error: 'Bitte deine Rolle auswählen.' }
  }

  const upsertPayload: Record<string, unknown> = {
    id: user.id,
    organization_id: organizationId,
    role: joinedViaInvite ? inviteRole : chosenRole,
  }

  const { error } = await supabase.from('profiles').upsert(upsertPayload)
  if (error) return { success: false, error: error.message }

  return { success: true }
}

export type ExtractPreviewResult =
  | { success: true; preview: { title?: string | null; summary?: string | null; industry?: string | null } }
  | { success: false; error: string }

export async function extractReferencePreview(file: File): Promise<ExtractPreviewResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  try {
    const fd = new FormData()
    fd.set('file', file)
    const extracted = await extractDataFromDocument(fd)
    const parsed = extracted as unknown as
      | { success: true; data?: { title?: string | null; summary?: string | null; industry?: string | null } }
      | { success: false; error?: string }

    if (!parsed?.success) {
      return { success: false, error: ('error' in parsed ? parsed.error : null) ?? 'Extraktion fehlgeschlagen.' }
    }
    return {
      success: true,
      preview: {
        title: parsed.data?.title ?? null,
        summary: parsed.data?.summary ?? null,
        industry: parsed.data?.industry ?? null,
      },
    }
  } catch (e) {
    console.error(e)
    return { success: false, error: 'Extraktion fehlgeschlagen.' }
  }
}

export type SendInvitesResult = { success: true } | { success: false; error: string }

export async function sendTeamInvites(
  invites: Array<{ email: string; role: 'sales' | 'account_manager' | 'admin' }>
): Promise<SendInvitesResult> {
  const unique = invites
    .map((i) => ({ email: i.email.trim().toLowerCase(), role: i.role }))
    .filter((i) => i.email.length > 0)
    .slice(0, 3)

  for (const inv of unique) {
    const res = await inviteByEmail(inv.email, inv.role)
    if (!res.success) return res
  }
  return { success: true }
}


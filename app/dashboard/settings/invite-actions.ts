'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { getAppOrigin } from '@/lib/env/app-origin'
import { sendTeamInviteEmail } from '@/lib/email/team-invite-email'

const INVITE_VALID_DAYS = 7

function formatInviteExpiresAt(expiresAt: Date): string {
  return expiresAt.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export type CreateInviteResult =
  | { success: true; link: string; expiresAt: string }
  | { success: false; error: string }

export async function createInvite(): Promise<CreateInviteResult> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id
  if (!organizationId) {
    return { success: false, error: 'Dein Profil ist keiner Organisation zugeordnet.' }
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITE_VALID_DAYS)

  const { error } = await supabase.from('organization_invites').insert({
    organization_id: organizationId,
    token,
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const origin = getAppOrigin()
  const link = `${origin}${ROUTES.register}?invite=${token}`

  return {
    success: true,
    link,
    expiresAt: expiresAt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  }
}

export type InviteByEmailResult =
  | { success: true; emailSent: true }
  | {
      success: true
      emailSent: false
      /** Einladungslink zum manuellen Teilen, wenn kein E-Mail-Versand möglich war */
      fallbackInviteLink: string
      emailError?: string
    }
  | { success: false; error: string }

export async function inviteByEmail(
  email: string,
  role: 'admin' | 'sales' = 'sales'
): Promise<InviteByEmailResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id
  if (!organizationId) {
    return { success: false, error: 'Dein Profil ist keiner Organisation zugeordnet.' }
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, error: 'Bitte eine gültige E-Mail-Adresse eingeben.' }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITE_VALID_DAYS)

  // RPC statt .insert(): PostgREST-Schema-Cache kennt ggf. Spalte `role` nicht,
  // obwohl sie in Postgres existiert – die Funktion schreibt direkt in die Tabelle.
  const { error: rpcError } = await supabase.rpc('create_organization_invite', {
    p_email: normalizedEmail,
    p_token: token,
    p_role: role,
    p_expires_at: expiresAt.toISOString(),
  })

  if (rpcError) {
    return { success: false, error: rpcError.message }
  }

  revalidatePath(ROUTES.settings)

  const origin = getAppOrigin()
  const inviteLink = `${origin}${ROUTES.register}?invite=${token}`
  const inviterName = profile?.full_name || user.email || 'Ein Teammitglied'
  const orgName = org?.name ?? 'Refstack'
  const expiresAtLabel = formatInviteExpiresAt(expiresAt)

  const emailResult = await sendTeamInviteEmail({
    to: normalizedEmail,
    inviterName,
    orgName,
    role,
    inviteLink,
    expiresAtLabel,
  })

  if (!emailResult.sent) {
    return {
      success: true,
      emailSent: false,
      fallbackInviteLink: inviteLink,
      emailError: emailResult.error,
    }
  }

  return { success: true, emailSent: true }
}

export type UpdatePendingInviteRoleResult =
  | { success: true }
  | { success: false; error: string }

export async function updatePendingInviteRole(params: {
  inviteId: string
  role: 'admin' | 'sales'
}): Promise<UpdatePendingInviteRoleResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { error } = await supabase.rpc('update_organization_invite_role', {
    p_invite_id: params.inviteId,
    p_role: params.role,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.settings)
  return { success: true }
}

export type ResendInviteResult =
  | { success: true; emailSent: true }
  | {
      success: true
      emailSent: false
      fallbackInviteLink: string
      emailError?: string
    }
  | { success: false; error: string }

export async function resendInviteEmail(params: {
  inviteId: string
}): Promise<ResendInviteResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id
  if (!organizationId) {
    return { success: false, error: 'Dein Profil ist keiner Organisation zugeordnet.' }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  const { data: inviteDataRaw, error: inviteErr } = await supabase.rpc(
    'get_organization_invite_for_resend',
    { p_invite_id: params.inviteId }
  )

  if (inviteErr) return { success: false, error: inviteErr.message }

  const parsed = inviteDataRaw as unknown
  const invite =
    parsed && typeof parsed === 'object'
      ? (parsed as { email?: string | null; token?: string | null; role?: string | null })
      : null

  const email = invite?.email?.trim().toLowerCase() || ''
  const token = invite?.token?.trim() || ''
  const inviteRole = invite?.role === 'admin' ? 'admin' : 'sales'
  if (!email || !token) {
    return { success: false, error: 'Einladung nicht gefunden oder abgelaufen.' }
  }

  const origin = getAppOrigin()
  const inviteLink = `${origin}${ROUTES.register}?invite=${token}`
  const inviterName = profile?.full_name || user.email || 'Ein Teammitglied'
  const orgName = org?.name ?? 'Refstack'

  const { data: inviteExpiry } = await supabase
    .from('organization_invites')
    .select('expires_at')
    .eq('id', params.inviteId)
    .maybeSingle()

  const expiresAt = inviteExpiry?.expires_at
    ? new Date(String(inviteExpiry.expires_at))
    : new Date(Date.now() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000)

  const emailResult = await sendTeamInviteEmail({
    to: email,
    inviterName,
    orgName,
    role: inviteRole,
    inviteLink,
    expiresAtLabel: formatInviteExpiresAt(expiresAt),
  })

  if (!emailResult.sent) {
    return {
      success: true,
      emailSent: false,
      fallbackInviteLink: inviteLink,
      emailError: emailResult.error,
    }
  }

  return { success: true, emailSent: true }
}

export type TeamMemberRow = {
  id: string
  email: string
  name: string | null
  status: 'active' | 'pending'
  isSelf?: boolean
  /** Nur aktive Mitglieder; bei Einladungen siehe inviteRole */
  role?: 'admin' | 'sales' | null
  /** Nur ausstehende Einladungen */
  inviteRole?: 'admin' | 'sales' | null
}

export async function getTeamMembers(): Promise<TeamMemberRow[]> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id
  if (!organizationId) return []

  const [profilesResult, invitesRpc] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('organization_id', organizationId),
    supabase.rpc('list_organization_pending_invites'),
  ])

  const active: TeamMemberRow[] = (profilesResult.data ?? []).map((p) => {
    const row = p as {
      id: string
      full_name?: string | null
      email?: string | null
      role?: string | null
    }
    const r = row.role
    const role = r === 'admin' ? 'admin' : r === 'sales' ? 'sales' : null
    return {
      id: row.id,
      email: row.email ?? '',
      name: row.full_name ?? null,
      status: 'active' as const,
      isSelf: row.id === user.id,
      role,
    }
  })

  if (invitesRpc.error) {
    console.error('[getTeamMembers] list_organization_pending_invites:', invitesRpc.error)
  }

  const rawPending = invitesRpc.data as unknown
  const pendingRows = Array.isArray(rawPending) ? rawPending : []

  const pending: TeamMemberRow[] = pendingRows.flatMap((row) => {
    const i = row as { id?: string; email?: string | null; role?: string | null }
    if (!i?.id) return []
    const r = i.role
    const inviteRole = r === 'admin' ? 'admin' : 'sales'
    return [
      {
        id: i.id,
        email: i.email ?? '',
        name: null,
        status: 'pending' as const,
        inviteRole,
      },
    ]
  })

  return [...active, ...pending]
}

export type RemoveMemberResult = { success: true } | { success: false; error: string }

/** Remove pending invite by invite id, or remove active member by profile id (sets organization_id to null). */
export async function removeMember(params: {
  inviteId?: string
  profileId?: string
}): Promise<RemoveMemberResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  const organizationId = myProfile?.organization_id
  if (!organizationId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  if (params.inviteId) {
    const { error } = await supabase
      .from('organization_invites')
      .delete()
      .eq('id', params.inviteId)
      .eq('organization_id', organizationId)
    if (error) return { success: false, error: error.message }
    revalidatePath(ROUTES.settings)
    return { success: true }
  }

  if (params.profileId) {
    const isAdmin = myProfile?.role === 'admin'
    const isSelf = params.profileId === user.id
    if (!isAdmin && !isSelf) {
      return { success: false, error: 'Nur Admins können andere Mitglieder entfernen.' }
    }
    const { error } = await supabase
      .from('profiles')
      .update({ organization_id: null })
      .eq('id', params.profileId)
      .eq('organization_id', organizationId)
    if (error) return { success: false, error: error.message }
    revalidatePath(ROUTES.settings)
    return { success: true }
  }

  return { success: false, error: 'inviteId oder profileId angeben.' }
}

export type UpdateMemberRoleResult = { success: true } | { success: false; error: string }

export async function updateMemberRole(params: {
  profileId: string
  role: 'admin' | 'sales'
}): Promise<UpdateMemberRoleResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  const organizationId = myProfile?.organization_id
  if (!organizationId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  if (myProfile?.role !== 'admin') {
    return { success: false, error: 'Nur Admins können Rollen ändern.' }
  }

  const role = params.role
  if (!['admin', 'sales'].includes(role)) {
    return { success: false, error: 'Ungültige Rolle.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', params.profileId)
    .eq('organization_id', organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.settings)
  return { success: true }
}

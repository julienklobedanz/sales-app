'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { Resend } from 'resend'

const INVITE_VALID_DAYS = 7

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

function inviteFromAddress(): string {
  const from = process.env.RESEND_FROM?.trim()
  if (from) return from
  return 'Refstack <onboarding@resend.dev>'
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '')
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
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
  role: 'admin' | 'sales' | 'account_manager' = 'sales'
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

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '')
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
  const inviteLink = `${origin}${ROUTES.register}?invite=${token}`
  const inviterName = profile?.full_name || user.email || 'Ein Teammitglied'
  const orgName = org?.name ?? 'Refstack'

  const resend = getResend()
  if (!resend) {
    return {
      success: true,
      emailSent: false,
      fallbackInviteLink: inviteLink,
      emailError:
        'RESEND_API_KEY fehlt in der Server-Umgebung (z. B. .env.local / Vercel). Ohne Key wird keine E-Mail gesendet.',
    }
  }

  try {
    const { error: sendError } = await resend.emails.send({
      from: inviteFromAddress(),
      to: normalizedEmail,
      subject: `Einladung zu ${orgName}`,
      html: `
          <h1>Team-Einladung</h1>
          <p><strong>${escapeHtml(inviterName)}</strong> lädt dich ein, dem Arbeitsbereich <strong>${escapeHtml(orgName)}</strong> beizutreten.</p>
          <p><a href="${inviteLink}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Jetzt beitreten</a></p>
          <p style="color: #666; font-size: 12px;">Der Link ist 7 Tage gültig.</p>
        `,
    })
    if (sendError) {
      console.error('[inviteByEmail] Resend API:', sendError)
      return {
        success: true,
        emailSent: false,
        fallbackInviteLink: inviteLink,
        emailError: sendError.message,
      }
    }
  } catch (e) {
    console.error('[inviteByEmail] Resend error:', e)
    const msg = e instanceof Error ? e.message : String(e)
    return {
      success: true,
      emailSent: false,
      fallbackInviteLink: inviteLink,
      emailError: msg,
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
  role?: 'admin' | 'sales' | 'account_manager' | null
  /** Nur ausstehende Einladungen */
  inviteRole?: 'admin' | 'sales' | 'account_manager' | null
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
    const role =
      r === 'admin' || r === 'sales' || r === 'account_manager' ? r : null
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
    const inviteRole =
      r === 'admin' || r === 'sales' || r === 'account_manager' ? r : 'sales'
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

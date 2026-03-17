'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const INVITE_VALID_DAYS = 7

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
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
  const link = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/register?invite=${token}`

  return {
    success: true,
    link,
    expiresAt: expiresAt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  }
}

export type InviteByEmailResult =
  | { success: true }
  | { success: false; error: string }

export async function inviteByEmail(email: string): Promise<InviteByEmailResult> {
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

  const { error: insertError } = await supabase.from('organization_invites').insert({
    organization_id: organizationId,
    email: normalizedEmail,
    token,
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  })

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  revalidatePath('/dashboard/settings')

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '')
  const inviteLink = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/register?invite=${token}`
  const inviterName = profile?.full_name || user.email || 'Ein Teammitglied'

  const resend = getResend()
  if (resend) {
    try {
      await resend.emails.send({
        from: 'Refstack <onboarding@resend.dev>',
        to: normalizedEmail,
        subject: `Einladung zu ${org?.name ?? 'Refstack'}`,
        html: `
          <h1>Team-Einladung</h1>
          <p><strong>${inviterName}</strong> lädt dich ein, dem Workspace <strong>${org?.name ?? 'Refstack'}</strong> beizutreten.</p>
          <p><a href="${inviteLink}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Jetzt beitreten</a></p>
          <p style="color: #666; font-size: 12px;">Der Link ist 7 Tage gültig.</p>
        `,
      })
    } catch (e) {
      console.error('[inviteByEmail] Resend error:', e)
      // Invite is already created; don't fail the request
    }
  }

  return { success: true }
}

export type TeamMemberRow = {
  id: string
  email: string
  name: string | null
  status: 'active' | 'pending'
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

  const [profilesResult, invitesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('organization_id', organizationId),
    supabase
      .from('organization_invites')
      .select('id, email')
      .eq('organization_id', organizationId)
      .gt('expires_at', new Date().toISOString()),
  ])

  const active: TeamMemberRow[] = (profilesResult.data ?? []).map((p) => ({
    id: p.id,
    email: (p as { email?: string | null }).email ?? '',
    name: (p as { full_name?: string | null }).full_name ?? null,
    status: 'active',
  }))

  const pending: TeamMemberRow[] = (invitesResult.data ?? []).map((i) => ({
    id: (i as { id: string }).id,
    email: (i as { email?: string | null }).email ?? '',
    name: null,
    status: 'pending',
  }))

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
    revalidatePath('/dashboard/settings')
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
      .update({ organization_id: null, updated_at: new Date().toISOString() })
      .eq('id', params.profileId)
      .eq('organization_id', organizationId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/dashboard/settings')
    return { success: true }
  }

  return { success: false, error: 'inviteId oder profileId angeben.' }
}

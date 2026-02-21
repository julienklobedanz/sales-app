'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

const INVITE_VALID_DAYS = 7

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

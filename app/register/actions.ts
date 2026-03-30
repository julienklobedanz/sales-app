'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type SignUpResult = { error?: string; success?: boolean }

export async function signUp(formData: FormData): Promise<SignUpResult> {
  const fullName = formData.get('full_name')?.toString()?.trim()
  const email = formData.get('email')?.toString()?.trim()
  const password = formData.get('password')?.toString()

  if (!fullName) return { error: 'Bitte Name eingeben.' }
  if (!email) return { error: 'Bitte E-Mail-Adresse eingeben.' }
  if (!password) return { error: 'Bitte Passwort eingeben.' }
  if (password.length < 6) {
    return { error: 'Das Passwort muss mindestens 6 Zeichen haben.' }
  }

  const supabase = await createServerSupabaseClient()

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '') || 'http://localhost:3000'
  const redirectTo = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${redirectTo}/auth/callback`,
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Diese E-Mail ist bereits registriert. Melde dich an.' }
    }
    return { error: error.message }
  }

  // Mit E-Mail-Bestätigung: oft keine Session bis Bestätigung → Erfolg anzeigen
  // Ohne Bestätigung: Session wird gesetzt → Onboarding (ggf. mit Einladung) oder Dashboard
  if (data.session) {
    const inviteToken = formData.get('invite_token')?.toString()?.trim()
    if (inviteToken) {
      // Invite-Flow: Workspace direkt zuordnen, dann ins Dashboard.
      const { data: inviteData, error: inviteError } = await supabase.rpc('get_invite_by_token', {
        invite_token: inviteToken,
      })

      const parsed = inviteData as { organization_id?: string; role?: string } | null
      const organizationId = parsed?.organization_id ?? null
      if (!inviteError && organizationId) {
        const roleRaw = (parsed?.role ?? 'sales').toString()
        const role =
          roleRaw === 'admin' || roleRaw === 'sales' || roleRaw === 'account_manager'
            ? roleRaw
            : 'sales'

        await supabase.from('profiles').upsert({
          id: data.user?.id,
          organization_id: organizationId,
          role,
          full_name: fullName,
        })
        redirect('/dashboard')
      }

      redirect(`/onboarding?invite=${encodeURIComponent(inviteToken)}`)
    }
    redirect('/onboarding')
  }

  return { success: true }
}

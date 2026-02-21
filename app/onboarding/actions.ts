'use server'

import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const roleRaw = formData.get('role') as string
  const role =
    roleRaw === 'sales' || roleRaw === 'admin' ? roleRaw : 'sales'
  const fullName = formData.get('full_name') as string
  const organizationName =
    (formData.get('organization_name') as string)?.trim() || 'Mein Unternehmen'
  let inviteToken = formData.get('invite_token')?.toString()?.trim() || null
  if (!inviteToken) {
    inviteToken = (await cookies()).get('invite_token')?.value?.trim() || null
  }

  // Einladung prüfen: gültiger Token → Organisation aus Einladung nutzen
  let organizationId: string | null = null
  if (inviteToken) {
    const { data: inviteData } = await supabase.rpc('get_invite_by_token', {
      invite_token: inviteToken,
    })
    const parsed = inviteData as { organization_id?: string } | null
    if (parsed?.organization_id) {
      organizationId = parsed.organization_id
      ;(await cookies()).set('invite_token', '', { path: '/', maxAge: 0 })
    }
  }

  // Keine Organisation aus Einladung → bestehendes Profil oder neue Org
  if (!organizationId) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    organizationId = existingProfile?.organization_id ?? null
  }

  // Immer noch keine Organisation → neue anlegen (per RPC, umgeht RLS beim ersten Onboarding)
  if (!organizationId) {
    const { data: newOrgId, error: orgError } = await supabase.rpc('create_organization', {
      org_name: organizationName,
    })

    if (orgError || !newOrgId) {
      console.error(orgError)
      throw new Error('Fehler beim Anlegen der Organisation')
    }
    organizationId = newOrgId as string
  }

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    organization_id: organizationId,
    role,
    full_name: fullName,
  })

  if (error) {
    console.error(error)
    throw new Error('Fehler beim Speichern des Profils')
  }

  redirect('/dashboard')
}

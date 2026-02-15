'use server'

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

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    role,
    full_name: fullName,
  })

  if (error) {
    console.error(error)
    throw new Error('Fehler beim Speichern des Profils')
  }

  redirect('/dashboard')
}

'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

export async function toggleFavoriteImpl(referenceId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht eingeloggt')

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('reference_id', referenceId)
    .maybeSingle()

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id)
  } else {
    await supabase.from('favorites').insert({
      user_id: user.id,
      reference_id: referenceId,
    })
  }

  revalidatePath(ROUTES.home)
}


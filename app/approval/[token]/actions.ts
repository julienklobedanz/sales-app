'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function updateStatusViaToken(
  id: string,
  token: string,
  status: string
) {
  const supabase = await createServerSupabaseClient()

  const { data, error: fetchError } = await supabase
    .from('references')
    .select('id')
    .eq('id', id)
    .eq('approval_token', token)
    .single()

  if (fetchError || !data) throw new Error('Ungültiger Token')

  const { error } = await supabase
    .from('references')
    .update({
      status,
      approval_token: null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

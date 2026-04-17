'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export type ApprovalContactOption = {
  id: string
  email: string | null
  label: string
}

export async function getContactOptionsForReferenceImpl(
  referenceId: string
): Promise<{ contacts: ApprovalContactOption[]; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { contacts: [], error: 'Nicht angemeldet' }

  const { data: ref, error: refErr } = await supabase
    .from('references')
    .select('company_id')
    .eq('id', referenceId)
    .single()

  if (refErr || !ref?.company_id) {
    return { contacts: [], error: 'Referenz nicht gefunden' }
  }

  const { data: rows, error } = await supabase
    .from('contact_persons')
    .select('id, email, first_name, last_name')
    .eq('company_id', ref.company_id)
    .order('last_name', { ascending: true })

  if (error) {
    console.error('[getContactOptionsForReference]', error.message)
    return { contacts: [], error: 'Kontakte konnten nicht geladen werden' }
  }

  const contacts: ApprovalContactOption[] = (rows ?? []).map((r) => {
    const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim()
    const label = name ? `${name}${r.email ? ` (${r.email})` : ''}` : (r.email ?? '—')
    return {
      id: r.id,
      email: r.email,
      label,
    }
  })

  return { contacts }
}

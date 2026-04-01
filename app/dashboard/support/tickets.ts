import { createServerSupabaseClient } from '@/lib/supabase/server'

export type SubmitTicketResult = { success: true } | { success: false; error: string }

export async function submitTicketImpl(
  type: 'support' | 'feedback',
  subject: string,
  message: string
): Promise<SubmitTicketResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const subj = subject?.toString()?.trim()
  const msg = message?.toString()?.trim()
  if (!subj) return { success: false, error: 'Bitte einen Betreff angeben.' }
  if (!msg) return { success: false, error: 'Bitte eine Nachricht eingeben.' }

  const { error } = await supabase.from('tickets').insert({
    user_id: user.id,
    type,
    subject: subj,
    message: msg,
    status: 'open',
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}


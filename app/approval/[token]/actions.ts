'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export type CompleteClientApprovalResult =
  | { success: true }
  | { success: false; error: string }

export async function completeClientApproval(params: {
  token: string
  decision: 'approved' | 'rejected'
  comment?: string
}): Promise<CompleteClientApprovalResult> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('complete_client_approval', {
    p_token: params.token,
    p_decision: params.decision,
    p_comment: params.comment ?? '',
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const payload = data as { success?: boolean; error?: string } | null
  if (!payload?.success) {
    const code = payload?.error ?? 'unknown'
    if (code === 'invalid_token') {
      return { success: false, error: 'invalid_token' }
    }
    if (code === 'already_decided') {
      return { success: false, error: 'already_decided' }
    }
    return { success: false, error: code }
  }

  return { success: true }
}

'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAppOrigin } from '@/lib/env/app-origin'

export type CompleteClientApprovalResult =
  | { success: true }
  | { success: false; error: string }

export async function completeClientApproval(params: {
  token: string
  decision: 'approved' | 'rejected'
  comment?: string
  approvedQuote?: string
  consentFileUrl?: string
  referenceGiverName?: string
  referenceGiverTitle?: string
}): Promise<CompleteClientApprovalResult> {
  const supabase = await createServerSupabaseClient()
  await supabase
    .from('references')
    .update({
      approval_quote_approved: params.approvedQuote?.trim() || null,
      approval_consent_file_url: params.consentFileUrl?.trim() || null,
      approval_reference_giver_name: params.referenceGiverName?.trim() || null,
      approval_reference_giver_title: params.referenceGiverTitle?.trim() || null,
    })
    .eq('approval_token', params.token)
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

export async function delegateClientApproval(params: {
  token: string
  delegateName?: string
  delegateEmail: string
}): Promise<CompleteClientApprovalResult> {
  const supabase = await createServerSupabaseClient()
  const token = params.token.trim()
  const email = params.delegateEmail.trim().toLowerCase()
  if (!email.includes('@')) return { success: false, error: 'Ungültige E-Mail.' }
  const { data: ref } = await supabase
    .from('references')
    .select('title')
    .eq('approval_token', token)
    .maybeSingle()
  const { error } = await supabase
    .from('references')
    .update({
      approval_delegated_to_name: params.delegateName?.trim() || null,
      approval_delegated_to_email: email,
    })
    .eq('approval_token', token)
  if (error) return { success: false, error: error.message }
  try {
    const { Resend } = await import('resend')
    const key = process.env.RESEND_API_KEY?.trim()
    if (key) {
      const resend = new Resend(key)
      const baseUrl = getAppOrigin()
      await resend.emails.send({
        from: 'Refstack <onboarding@resend.dev>',
        to: email,
        subject: `Delegierte Freigabe: ${(ref as { title?: string } | null)?.title ?? 'Referenz'}`,
        html: `<p>Sie wurden als zuständiger Ansprechpartner für eine Referenz-Freigabe benannt.</p><p><a href="${baseUrl}/approval/${token}">Zur Freigabe</a></p>`,
      })
    }
  } catch {
    // best effort mail
  }
  return { success: true }
}

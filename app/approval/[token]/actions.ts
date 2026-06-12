'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { completeClientApprovalWithAdmin } from '@/lib/references/complete-client-approval'
import type { CustomerApprovalScopeSelection } from '@/lib/references/customer-approval-scope'
import { getAppOrigin } from '@/lib/env/app-origin'
import { formatApprovalGiverLine } from '@/lib/references/approval-workflow-display'

export type CompleteClientApprovalResult =
  | { success: true; confirmationEmailSent?: boolean }
  | { success: false; error: string }

export async function completeClientApproval(params: {
  token: string
  decision: 'approved' | 'rejected' | 'changes_needed'
  comment?: string
  approvedQuote?: string
  consentFileUrl?: string
  referenceGiverName?: string
  referenceGiverTitle?: string
  scope?: CustomerApprovalScopeSelection
}): Promise<CompleteClientApprovalResult> {
  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return { success: false, error: 'server_config' }
  }

  return completeClientApprovalWithAdmin(admin, params)
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
    .select(
      'id, title, organization_id, approval_reference_giver_name, approval_reference_giver_title'
    )
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

  const refRow = ref as {
    id?: string
    organization_id?: string
    approval_reference_giver_name?: string | null
    approval_reference_giver_title?: string | null
  } | null
  if (refRow?.id && refRow.organization_id) {
    const admin = createServiceRoleSupabaseClient()
    if (admin) {
      const { error: eventError } = await admin.from('evidence_events').insert({
        organization_id: refRow.organization_id,
        reference_id: refRow.id,
        event_type: 'approval_delegated',
        payload: {
          delegate_name: params.delegateName?.trim() || null,
          delegate_email: email,
          from_giver: formatApprovalGiverLine(
            refRow.approval_reference_giver_name,
            refRow.approval_reference_giver_title
          ),
        },
        created_by: null,
      })
      if (eventError) console.error('[delegateClientApproval] event log failed:', eventError.message)
    }
  }
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

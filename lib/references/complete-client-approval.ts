import type { SupabaseClient } from '@supabase/supabase-js'
import {
  customerApprovalScopeToDbPatch,
  type CustomerApprovalScopeSelection,
} from '@/lib/references/customer-approval-scope'

export type CompleteClientApprovalParams = {
  token: string
  decision: 'approved' | 'rejected'
  comment?: string
  approvedQuote?: string
  consentFileUrl?: string
  referenceGiverName?: string
  referenceGiverTitle?: string
  scope?: CustomerApprovalScopeSelection
}

export type CompleteClientApprovalResult =
  | { success: true }
  | { success: false; error: string }

type ReferenceApprovalRow = {
  id: string
  company_id: string
  organization_id: string | null
  customer_approval_status: string | null
  status: string
  approval_token: string | null
  approval_reference_status_snapshot: string | null
  approval_requested_by: string | null
}

export async function completeClientApprovalWithAdmin(
  admin: SupabaseClient,
  params: CompleteClientApprovalParams
): Promise<CompleteClientApprovalResult> {
  const token = params.token.trim()
  if (!token) {
    return { success: false, error: 'invalid_token' }
  }

  const { data: row, error: fetchError } = await admin
    .from('references')
    .select(
      'id, company_id, organization_id, customer_approval_status, status, approval_token, approval_reference_status_snapshot, approval_requested_by'
    )
    .eq('approval_token', token)
    .maybeSingle()

  if (fetchError || !row) {
    return { success: false, error: 'invalid_token' }
  }

  const ref = row as ReferenceApprovalRow
  if (!ref.approval_token) {
    return { success: false, error: 'invalid_token' }
  }

  const customerStatus = ref.customer_approval_status
  const statusText = String(ref.status ?? '')
  const canDecide =
    customerStatus === 'pending' || (customerStatus == null && statusText === 'pending')
  if (!canDecide) {
    return { success: false, error: 'already_decided' }
  }

  let orgId = ref.organization_id
  if (!orgId) {
    const { data: company } = await admin
      .from('companies')
      .select('organization_id')
      .eq('id', ref.company_id)
      .maybeSingle()
    orgId = (company as { organization_id?: string | null } | null)?.organization_id ?? null
  }
  if (!orgId) {
    return { success: false, error: 'org_missing' }
  }

  const snapshot = ref.approval_reference_status_snapshot?.trim()
  const newStatus = params.decision === 'approved' ? 'external' : snapshot || 'draft'

  const approved = params.decision === 'approved'
  const scopePatch = approved && params.scope ? customerApprovalScopeToDbPatch(params.scope) : {}

  const { error: updateError } = await admin
    .from('references')
    .update({
      customer_approval_status: params.decision,
      approval_comment: params.comment?.trim() || null,
      approval_responded_at: new Date().toISOString(),
      approval_token: null,
      status: newStatus,
      approval_quote_approved: params.approvedQuote?.trim() || null,
      approval_consent_file_url: params.consentFileUrl?.trim() || null,
      approval_reference_giver_name: params.referenceGiverName?.trim() || null,
      approval_reference_giver_title: params.referenceGiverTitle?.trim() || null,
      ...(approved
        ? {
            approval_internal_status: 'approved_internal',
            approval_internal_reviewed_at: new Date().toISOString(),
          }
        : {}),
      ...scopePatch,
    })
    .eq('id', ref.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  await admin
    .from('approvals')
    .update({ status: params.decision === 'approved' ? 'approved' : 'rejected' })
    .eq('reference_id', ref.id)
    .eq('status', 'pending')

  const { error: eventError } = await admin.from('evidence_events').insert({
    organization_id: orgId,
    reference_id: ref.id,
    event_type: 'reference_approval_responded',
    payload: {
      decision: params.decision,
      comment: params.comment?.trim() || null,
      scope: params.scope ?? null,
    },
    created_by: ref.approval_requested_by,
  })

  if (eventError) {
    return { success: false, error: eventError.message }
  }

  return { success: true }
}

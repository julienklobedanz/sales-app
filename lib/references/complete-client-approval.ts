import type { SupabaseClient } from '@supabase/supabase-js'
import {
  customerApprovalScopeToDbPatch,
  type CustomerApprovalScopeSelection,
} from '@/lib/references/customer-approval-scope'
import { sendClientApprovalConfirmationEmail } from '@/lib/references/client-approval-confirmation-email'
import { effectiveCustomerApprovalStatus } from '@/lib/references/effective-customer-approval'
import {
  notifyInternalTeamCustomerApproved,
  notifyInternalTeamCustomerChangesNeeded,
  notifyInternalTeamCustomerRejected,
} from '@/lib/references/approval-workflow-internal-notifications'

export type CompleteClientApprovalParams = {
  token: string
  decision: 'approved' | 'rejected' | 'changes_needed'
  comment?: string
  approvedQuote?: string
  consentFileUrl?: string
  referenceGiverName?: string
  referenceGiverTitle?: string
  scope?: CustomerApprovalScopeSelection
}

export type CompleteClientApprovalResult =
  | { success: true; confirmationEmailSent?: boolean }
  | { success: false; error: string }

type ReferenceApprovalRow = {
  id: string
  title: string
  company_id: string
  organization_id: string | null
  customer_approval_status: string | null
  status: string
  approval_token: string | null
  approval_reference_status_snapshot: string | null
  approval_requested_by: string | null
  approval_contact_id: string | null
  approval_external_contact_id: string | null
  approval_delegated_to_email: string | null
  approval_delegated_to_name: string | null
  approval_reference_giver_name?: string | null
  companies?: { name?: string } | { name?: string }[] | null
}

function companyNameFromRow(row: ReferenceApprovalRow): string {
  const companyRaw = row.companies
  const company =
    Array.isArray(companyRaw) && companyRaw.length > 0
      ? (companyRaw[0] as { name?: string })
      : (companyRaw as { name?: string } | null)
  return company?.name?.trim() || 'Referenz'
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
      `
      id,
      title,
      company_id,
      organization_id,
      customer_approval_status,
      status,
      approval_token,
      approval_reference_status_snapshot,
      approval_requested_by,
      approval_contact_id,
      approval_external_contact_id,
      approval_delegated_to_email,
      approval_delegated_to_name,
      approval_reference_giver_name,
      companies ( name )
    `
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

  const statusText = String(ref.status ?? '')
  const effectiveCustomer = effectiveCustomerApprovalStatus(
    ref.customer_approval_status,
    ref.status
  )
  const isPending =
    effectiveCustomer === 'pending' ||
    (ref.customer_approval_status == null && statusText === 'pending')
  const isApproved = effectiveCustomer === 'approved'
  const isUpdate = isApproved && params.decision === 'approved'

  if (!isPending && !isUpdate) {
    if (effectiveCustomer === 'rejected') {
      return { success: false, error: 'already_decided' }
    }
    if (isApproved && params.decision === 'rejected') {
      return { success: false, error: 'already_decided' }
    }
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
  const approved = params.decision === 'approved'
  const rejected = params.decision === 'rejected'
  const changesNeeded = params.decision === 'changes_needed'

  if (rejected && !params.comment?.trim()) {
    return { success: false, error: 'comment_required' }
  }
  const scopePatch = approved && params.scope ? customerApprovalScopeToDbPatch(params.scope) : {}

  if (changesNeeded) {
    if (!isPending) {
      return { success: false, error: 'already_decided' }
    }
    const comment = params.comment?.trim()
    if (!comment) {
      return { success: false, error: 'comment_required' }
    }

    const { error: updateError } = await admin
      .from('references')
      .update({
        approval_comment: comment,
        approval_reference_giver_name: params.referenceGiverName?.trim() || null,
        approval_reference_giver_title: params.referenceGiverTitle?.trim() || null,
      })
      .eq('id', ref.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    const referenceGiverName =
      params.referenceGiverName?.trim() ||
      ref.approval_reference_giver_name?.trim() ||
      null

    const { error: eventError } = await admin.from('evidence_events').insert({
      organization_id: orgId,
      reference_id: ref.id,
      event_type: 'reference_approval_responded',
      payload: {
        decision: 'changes_needed',
        comment,
        is_update: false,
        reference_giver_name: referenceGiverName,
      },
      created_by: ref.approval_requested_by,
    })

    if (eventError) {
      return { success: false, error: eventError.message }
    }

    void notifyInternalTeamCustomerChangesNeeded({
      admin,
      referenceId: ref.id,
      comment,
    })

    return { success: true }
  }

  const updatePatch: Record<string, unknown> = {
    approval_comment: params.comment?.trim() || null,
    approval_responded_at: new Date().toISOString(),
    approval_quote_approved: params.approvedQuote?.trim() || null,
    approval_consent_file_url: params.consentFileUrl?.trim() || null,
    approval_reference_giver_name: params.referenceGiverName?.trim() || null,
    approval_reference_giver_title: params.referenceGiverTitle?.trim() || null,
    ...scopePatch,
  }

  if (isUpdate) {
    // Freigabe-Link bleibt aktiv — Kunde kann Anmerkungen jederzeit anpassen.
  } else if (approved) {
    updatePatch.customer_approval_status = 'approved'
    updatePatch.approval_token = token
    updatePatch.status = 'external'
  } else {
    updatePatch.customer_approval_status = 'rejected'
    updatePatch.approval_token = null
    updatePatch.status = snapshot || 'draft'
  }

  const { error: updateError } = await admin.from('references').update(updatePatch).eq('id', ref.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  if (!isUpdate) {
    await admin
      .from('approvals')
      .update({ status: approved ? 'approved' : 'rejected' })
      .eq('reference_id', ref.id)
      .eq('status', 'pending')
  }

  const { error: eventError } = await admin.from('evidence_events').insert({
    organization_id: orgId,
    reference_id: ref.id,
    event_type: isUpdate ? 'reference_approval_updated' : 'reference_approval_responded',
    payload: {
      decision: params.decision,
      comment: params.comment?.trim() || null,
      scope: params.scope ?? null,
      is_update: isUpdate,
    },
    created_by: ref.approval_requested_by,
  })

  if (eventError) {
    return { success: false, error: eventError.message }
  }

  if (!isUpdate) {
    if (approved) {
      void notifyInternalTeamCustomerApproved({ admin, referenceId: ref.id })
    } else if (rejected) {
      void notifyInternalTeamCustomerRejected({
        admin,
        referenceId: ref.id,
        comment: params.comment,
      })
    }
  }

  let confirmationEmailSent = false
  if (approved) {
    confirmationEmailSent = await sendClientApprovalConfirmationEmail({
      admin,
      referenceId: ref.id,
      organizationId: (ref as { organization_id?: string | null }).organization_id,
      refTitle: ref.title,
      companyName: companyNameFromRow(ref),
      isUpdate,
      recipient: {
        approval_contact_id: ref.approval_contact_id,
        approval_external_contact_id: ref.approval_external_contact_id,
        approval_delegated_to_email: ref.approval_delegated_to_email,
        approval_delegated_to_name: ref.approval_delegated_to_name,
      },
    })
  }

  return { success: true, confirmationEmailSent }
}

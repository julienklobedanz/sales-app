'use server'

import { getExistingShareForReference } from '@/app/dashboard/actions'
import { resolveCustomerApprovalFollowUpUi } from '@/lib/references/approval-change-requests'
import {
  formatApprovalDelegatedRecipientLine,
  formatApprovalGiverLine,
  resolveApprovalCoordinatorDisplay,
} from '@/lib/references/approval-workflow-display'
import { canStartApprovalWorkflow } from '@/lib/references/approval-workflow'
import {
  canEditInternalApprovalCoordinator,
  canEditPreCustomerApprovalRecipient,
} from '@/lib/references/pre-customer-approval-edit'
import { resolveReferenceReadinessState } from '@/lib/references/reference-readiness-state'
import { isStaleInternalPending } from '@/lib/references/stale-internal-pending'
import type { ReferenceInternalFrameSupplement } from '@/lib/references/reference-internal-frame-supplement'
import { canApproveInternalReference } from '@/lib/roles/reference-access'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function loadReferenceInternalFrameSupplement(
  referenceId: string,
): Promise<ReferenceInternalFrameSupplement | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role, capabilities')
    .eq('id', user.id)
    .single()
  if (!profile) return null

  const parsedRoles = parseProfileRoles(profile)
  const { systemRole, functionRole, capabilities } = parsedRoles

  const { data: row, error } = await supabase
    .from('references')
    .select(
      `
      id,
      status,
      contact_id,
      customer_contact_id,
      customer_approval_status,
      approval_owner_name,
      approval_requester_name,
      approval_coordinator_email,
      approval_coordinator_name,
      approval_customer_facing_name,
      approval_requested_at,
      approval_scope_named_mention,
      approval_scope_anonymous_mention,
      approval_scope_reference_call,
      approval_scope_logo_use,
      approval_scope_confidential_sales,
      approval_internal_status,
      approval_contact_id,
      approval_external_contact_id,
      approval_reference_giver_name,
      approval_reference_giver_title,
      approval_delegated_to_name,
      approval_delegated_to_email,
      approval_quote_proposed,
      approval_quote_approved,
      approval_comment,
      approval_consent_file_url,
      company_id
    `,
    )
    .eq('id', referenceId)
    .maybeSingle()

  if (error || !row) return null

  const normalizedStatus = String(row.status ?? '').toLowerCase()
  const internalApproval = String(row.approval_internal_status ?? '').toLowerCase()
  const isWithdrawnInternal = internalApproval === 'withdrawn_internal'
  const customerAccessRevoked =
    String(row.customer_approval_status ?? '').toLowerCase() === 'revoked_by_customer'
  const isApprovalGranted =
    !isWithdrawnInternal &&
    !customerAccessRevoked &&
    (String(row.customer_approval_status ?? '').toLowerCase() === 'approved' ||
      normalizedStatus === 'approved' ||
      normalizedStatus === 'external')
  const staleInternalPending = isStaleInternalPending({
    internalApprovalStatus: internalApproval,
    customerApprovalStatus: row.customer_approval_status,
    referenceStatus: normalizedStatus,
    approvalRequestedAt: row.approval_requested_at,
    customerAccessRevoked,
  })
  const referenceIsInternalOnly =
    normalizedStatus === 'internal_only' || normalizedStatus === 'internal'

  const canStartApproval = canStartApprovalWorkflow({
    systemRole,
    functionRole,
    referenceStatus: normalizedStatus,
    internalApprovalStatus: internalApproval,
    customerApprovalStatus: row.customer_approval_status,
    approvalRequestedAt: row.approval_requested_at,
    staleInternalPending,
    isApprovalGranted,
  })
  const canInternalApprove = canApproveInternalReference(
    functionRole,
    systemRole,
    capabilities,
  )
  const readiness = resolveReferenceReadinessState({
    referenceStatus: normalizedStatus,
    internalApprovalStatus: internalApproval,
    customerApprovalStatus: row.customer_approval_status,
    approvalRequestedAt: row.approval_requested_at,
    staleInternalPending,
    isApprovalGranted,
    canStartApproval,
    canInternalApprove,
    approvalScopeNamedMention: row.approval_scope_named_mention,
    approvalScopeAnonymousMention: row.approval_scope_anonymous_mention,
    approvalScopeReferenceCall: row.approval_scope_reference_call,
    approvalScopeConfidentialSales: row.approval_scope_confidential_sales,
    approvalScopeLogoUse: row.approval_scope_logo_use,
    referenceIsInternalOnly,
  })

  let defaultAccountManagerEmail: string | null = null
  if (row.company_id) {
    const { data: companyApprovalRow } = await supabase
      .from('companies')
      .select('internal_reference_approval_contact_id')
      .eq('id', row.company_id)
      .maybeSingle()
    const internalApprovalContactId =
      companyApprovalRow?.internal_reference_approval_contact_id
    if (internalApprovalContactId) {
      const { data: approvalContactPerson } = await supabase
        .from('contact_persons')
        .select('email')
        .eq('id', internalApprovalContactId)
        .eq('company_id', row.company_id)
        .maybeSingle()
      const email = String(approvalContactPerson?.email ?? '').trim()
      if (email.includes('@')) defaultAccountManagerEmail = email
    }
  }

  const customerApprovalFollowUp = await resolveCustomerApprovalFollowUpUi(
    supabase,
    referenceId,
    row.customer_approval_status,
    row.approval_comment,
    { showMagicLink: readiness.showMagicLink },
  )
  const existingShare = await getExistingShareForReference(referenceId)

  return {
    existingSharePath: existingShare?.url ?? null,
    readiness,
    canStartApproval,
    canInternalApprove:
      canInternalApprove &&
      String(row.approval_internal_status ?? '') === 'approved_internal' &&
      !staleInternalPending,
    defaultAccountManagerEmail,
    approvalContactId: row.approval_contact_id ?? null,
    approvalExternalContactId: row.approval_external_contact_id ?? null,
    referenceContactId: row.contact_id ?? null,
    referenceCustomerContactId: row.customer_contact_id ?? null,
    hasCustomerChangeRequests: customerApprovalFollowUp.hasOpenChangeRequests,
    canEditCustomerEmail:
      customerApprovalFollowUp.canEditCustomerEmail ||
      canEditPreCustomerApprovalRecipient({
        customerApprovalStatus: row.customer_approval_status,
        approvalRequestedAt: row.approval_requested_at,
        internalApprovalStatus: internalApproval,
      }),
    canEditCoordinatorEmail: canEditInternalApprovalCoordinator({
      approvalRequestedAt: row.approval_requested_at,
      internalApprovalStatus: internalApproval,
    }),
    customerChangeRequestComment: row.approval_comment,
    approvalMeta: {
      requestedByDisplay:
        (row.approval_requester_name ?? row.approval_owner_name ?? '').trim() || null,
      coordinatorDisplay: resolveApprovalCoordinatorDisplay({
        customerFacingName: row.approval_customer_facing_name,
        coordinatorName: row.approval_coordinator_name,
        coordinatorEmail: row.approval_coordinator_email,
      }),
      approvingCustomerDisplay: formatApprovalGiverLine(
        row.approval_reference_giver_name,
        row.approval_reference_giver_title,
      ),
      delegatedRecipientDisplay: formatApprovalDelegatedRecipientLine(
        row.approval_delegated_to_name,
        row.approval_delegated_to_email,
      ),
      customerAccessRevoked,
      approvalQuoteApproved: row.approval_quote_approved,
      approvalQuoteProposed: row.approval_quote_proposed,
      approvalConsentFileUrl: row.approval_consent_file_url,
    },
  }
}

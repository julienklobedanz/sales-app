'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import type { SubmitForApprovalOptions } from '@/lib/references/library/approval-submit-types'
import { ensureApprovalRecipientFromInputImpl } from '@/lib/references/library/approval-contacts'
import { profileCanManageOrgData } from '@/lib/roles/profile-guards'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { hasActiveCustomerApprovalWorkflow } from '@/lib/references/effective-customer-approval'
import { isApprovalRecipientEmail } from '@/lib/references/approval-recipient-input'
import {
  canEditInternalApprovalCoordinator,
  canEditPreCustomerApprovalRecipient,
} from '@/lib/references/pre-customer-approval-edit'
import { sendInternalApprovalReviewEmail } from '@/lib/references/internal-approval-email'
import { sendClientApprovalEmail } from '@/lib/references/library/approvals-client-email'
import { referenceGiverNameFromRecipientEmail } from '@/lib/references/library/approvals-helpers'
import { resolveContactForApproval } from '@/lib/references/library/approvals-recipient'
import type {
  ApproveInternalRecipientOptions,
  ReferenceApprovalRow,
  ResolvedApprovalRecipient,
} from '@/lib/references/library/approvals-types'
import { log } from '@/lib/observability/logger'

export async function updateApprovalRecipientImpl(
  referenceId: string,
  recipient: ApproveInternalRecipientOptions,
): Promise<
  { success: true; customerEmailSent?: boolean } | { success: false; error: string }
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht authentifiziert' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role, function_role, full_name, organization_id')
    .eq('id', user.id)
    .single()
  const { systemRole, functionRole } = parseProfileRoles(profile)

  const { data: row, error: fetchError } = await supabase
    .from('references')
    .select(
      `
      title,
      status,
      company_id,
      contact_id,
      customer_contact_id,
      customer_approval_status,
      approval_requested_by,
      approval_requested_at,
      approval_internal_status,
      approval_contact_id,
      approval_external_contact_id,
      approval_customer_facing_name,
      approval_coordinator_name,
      companies ( name )
    `,
    )
    .eq('id', referenceId)
    .single()

  if (fetchError || !row) return { success: false, error: 'Referenz nicht gefunden' }

  const ref = row as unknown as ReferenceApprovalRow & {
    approval_requested_by?: string | null
    approval_requested_at?: string | null
    approval_internal_status?: string | null
    approval_customer_facing_name?: string | null
    approval_coordinator_name?: string | null
  }

  const internalStatus = String(ref.approval_internal_status ?? '').toLowerCase()
  const preCustomerEdit = canEditPreCustomerApprovalRecipient({
    customerApprovalStatus: ref.customer_approval_status,
    approvalRequestedAt: ref.approval_requested_at,
    internalApprovalStatus: ref.approval_internal_status,
  })

  if (
    !hasActiveCustomerApprovalWorkflow(ref.customer_approval_status, ref.status) &&
    !preCustomerEdit
  ) {
    return { success: false, error: 'Es liegt keine aktive Kunden-Freigabe vor.' }
  }

  const canEdit =
    profileCanManageOrgData(systemRole, functionRole) ||
    ref.approval_requested_by === user.id
  if (!canEdit) {
    return { success: false, error: 'Keine Berechtigung, den Kundenkontakt zu ändern.' }
  }

  let recipientOpts: SubmitForApprovalOptions = {
    contactId: recipient?.contactId,
    externalContactId: recipient?.externalContactId,
  }

  if (
    recipient?.recipientEmail?.trim() &&
    !recipient.contactId &&
    !recipient.externalContactId
  ) {
    const ensured = await ensureApprovalRecipientFromInputImpl(
      supabase,
      referenceId,
      recipient.recipientEmail.trim(),
    )
    if ('error' in ensured) {
      return { success: false, error: ensured.error }
    }
    recipientOpts = {
      contactId: ensured.contactId ?? undefined,
      externalContactId: ensured.externalContactId ?? undefined,
    }
  }

  let resolved: ResolvedApprovalRecipient
  try {
    resolved = await resolveContactForApproval(
      supabase,
      ref,
      ref.company_id,
      recipientOpts,
      { requireRecipientEmail: true },
    )
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'Kein gültiger Empfänger für die Freigabe.'
    return { success: false, error: msg }
  }

  const { error: syncErr } = await supabase
    .from('references')
    .update({
      approval_contact_id: resolved.approvalContactId,
      approval_external_contact_id: resolved.approvalExternalContactId,
      approval_delegated_to_name: null,
      approval_delegated_to_email: null,
      approval_reference_giver_name: referenceGiverNameFromRecipientEmail(resolved.email),
    })
    .eq('id', referenceId)
  if (syncErr) return { success: false, error: syncErr.message }

  const shouldSendCustomerEmail =
    hasActiveCustomerApprovalWorkflow(ref.customer_approval_status, ref.status) ||
    (preCustomerEdit && internalStatus === 'approved_internal')

  let customerEmailSent = false
  if (shouldSendCustomerEmail) {
    const company =
      Array.isArray(ref.companies) && ref.companies.length > 0
        ? (ref.companies[0] as { name?: string })
        : (ref.companies as { name?: string } | null)
    const companyName = company?.name ?? 'Referenz'

    const orgId = String(
      (profile as { organization_id?: string | null }).organization_id ?? '',
    ).trim()
    let vendorOrgName = companyName
    if (orgId) {
      const { data: orgRow } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle()
      vendorOrgName = String(orgRow?.name ?? '').trim() || companyName
    }

    const customerFacingName =
      typeof ref.approval_customer_facing_name === 'string' &&
      ref.approval_customer_facing_name.trim()
        ? ref.approval_customer_facing_name.trim()
        : typeof (profile as { full_name?: string }).full_name === 'string'
          ? (profile as { full_name: string }).full_name.trim()
          : ''

    try {
      const sent = await sendClientApprovalEmail({
        supabase,
        referenceId,
        ref,
        customerFacingName,
        vendorOrgName,
        contactEmail: resolved.email,
        firstName: resolved.firstName,
        companyName,
        sendResendToCustomer: true,
      })
      customerEmailSent = sent.emailSent
    } catch (e) {
      log.error(
        'customer email failed',
        { action: 'updateApprovalRecipientImpl.customerEmail' },
        e,
      )
    }
  }

  revalidatePath(ROUTES.references.detail(referenceId))
  return { success: true, customerEmailSent }
}

export async function updateApprovalCoordinatorImpl(
  referenceId: string,
  coordinatorEmail: string,
): Promise<{ success: true; emailSent: boolean } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht authentifiziert' }

  const email = coordinatorEmail.trim().toLowerCase()
  if (!isApprovalRecipientEmail(email)) {
    return { success: false, error: 'Bitte eine gültige E-Mail-Adresse eingeben.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role, function_role')
    .eq('id', user.id)
    .single()
  const { systemRole, functionRole } = parseProfileRoles(profile)

  const { data: row, error: fetchError } = await supabase
    .from('references')
    .select(
      `
      id,
      title,
      approval_internal_status,
      approval_requested_at,
      approval_requested_by,
      approval_requester_name,
      approval_message,
      companies ( name )
    `,
    )
    .eq('id', referenceId)
    .single()

  if (fetchError || !row) return { success: false, error: 'Referenz nicht gefunden' }

  const ref = row as {
    id: string
    title?: string | null
    approval_internal_status?: string | null
    approval_requested_at?: string | null
    approval_requested_by?: string | null
    approval_requester_name?: string | null
    approval_message?: string | null
    companies?: { name?: string } | { name?: string }[] | null
  }

  if (
    !canEditInternalApprovalCoordinator({
      approvalRequestedAt: ref.approval_requested_at,
      internalApprovalStatus: ref.approval_internal_status,
    })
  ) {
    return {
      success: false,
      error: 'Die interne Freigabe kann derzeit nicht umgeleitet werden.',
    }
  }

  const canEdit =
    profileCanManageOrgData(systemRole, functionRole) ||
    ref.approval_requested_by === user.id
  if (!canEdit) {
    return {
      success: false,
      error: 'Keine Berechtigung, den intern Verantwortlichen zu ändern.',
    }
  }

  const internalReviewToken = crypto.randomUUID()
  const company =
    Array.isArray(ref.companies) && ref.companies.length > 0
      ? ref.companies[0]
      : (ref.companies as { name?: string } | null)
  const accountCompanyName = company?.name?.trim() || 'Account'
  const coordinatorName = referenceGiverNameFromRecipientEmail(email)

  const { error: updateError } = await supabase
    .from('references')
    .update({
      approval_coordinator_email: email,
      approval_coordinator_name: coordinatorName,
      approval_internal_review_token: internalReviewToken,
    })
    .eq('id', referenceId)
    .eq('approval_internal_status', 'pending_internal')

  if (updateError) return { success: false, error: updateError.message }

  const emailSent = await sendInternalApprovalReviewEmail({
    to: email,
    greeting: coordinatorName ? `Hallo ${coordinatorName},` : 'Hallo,',
    referenceTitle: String(ref.title ?? 'Referenz'),
    accountCompanyName,
    requesterName: String(ref.approval_requester_name ?? '').trim(),
    message: ref.approval_message,
    internalReviewToken,
    referenceId,
  })

  revalidatePath(ROUTES.references.detail(referenceId))
  return { success: true, emailSent }
}

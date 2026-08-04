'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { revalidateOrgCachesForReference } from '@/lib/cache/revalidate-org'
import type { SubmitForApprovalOptions } from '@/lib/references/library/approval-submit-types'
import { ensureApprovalRecipientFromInputImpl } from '@/lib/references/library/approval-contacts'
import { logEventForCurrentOrg } from '@/lib/events/log-event'
import { profileCanManageOrgData } from '@/lib/roles/profile-guards'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { sendClientApprovalEmail } from '@/lib/references/library/approvals-client-email'
import { referenceGiverNameFromRecipientEmail } from '@/lib/references/library/approvals-helpers'
import { resolveContactForApproval } from '@/lib/references/library/approvals-recipient'
import type { ApproveInternalAndSendResult, ApproveInternalRecipientOptions, ReferenceApprovalRow } from '@/lib/references/library/approvals-types'

export async function approveInternalAndSendImpl(
  referenceId: string,
  recipient?: ApproveInternalRecipientOptions
): Promise<ApproveInternalAndSendResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht authentifiziert.' }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('system_role, function_role, full_name, organization_id')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError || !profile) {
    return { success: false, error: 'Profil nicht gefunden. Bitte Onboarding abschließen.' }
  }
  const { systemRole, functionRole } = parseProfileRoles(profile)
  if (!profileCanManageOrgData(systemRole, functionRole)) {
    return { success: false, error: 'Nur Admin oder Account Manager dürfen extern versenden.' }
  }

  const { data: row, error } = await supabase
    .from('references')
    .select(
      `id, title, status, company_id, contact_id, customer_contact_id, approval_contact_id, approval_external_contact_id, customer_approval_status, approval_internal_status, approval_reference_status_snapshot, approval_requested_by, companies(name)`
    )
    .eq('id', referenceId)
    .single()
  if (error || !row) return { success: false, error: 'Referenz nicht gefunden.' }
  const ref = row as unknown as ReferenceApprovalRow & {
    approval_internal_status?: string | null
  }

  const internalStatus = String(ref.approval_internal_status ?? '').toLowerCase()
  if (internalStatus !== 'approved_internal') {
    return {
      success: false,
      error:
        'Bitte zuerst die interne Freigabe über den Link in der E-Mail bestätigen, bevor die Kundenfreigabe vorbereitet werden kann.',
    }
  }
  const company =
    Array.isArray(ref.companies) && ref.companies.length > 0
      ? (ref.companies[0] as { name?: string })
      : (ref.companies as { name?: string } | null)
  const company_name = company?.name ?? 'Referenz'

  let contactEmail: string
  let firstName: string
  try {
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
        recipient.recipientEmail.trim()
      )
      if ('error' in ensured) {
        return { success: false, error: ensured.error }
      }
      recipientOpts = {
        contactId: ensured.contactId ?? undefined,
        externalContactId: ensured.externalContactId ?? undefined,
      }
    }

    const resolved = await resolveContactForApproval(
      supabase,
      ref,
      ref.company_id,
      recipientOpts,
      { requireRecipientEmail: false }
    )
    contactEmail = resolved.email
    firstName = resolved.firstName

    const { error: syncErr } = await supabase
      .from('references')
      .update({
        approval_contact_id: resolved.approvalContactId,
        approval_external_contact_id: resolved.approvalExternalContactId,
        approval_reference_giver_name: referenceGiverNameFromRecipientEmail(contactEmail),
      })
      .eq('id', referenceId)
    if (syncErr) return { success: false, error: syncErr.message }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Kein gültiger Empfänger für die Freigabe.'
    return { success: false, error: msg }
  }

  const customerFacingName =
    typeof (profile as { full_name?: string }).full_name === 'string'
      ? (profile as { full_name: string }).full_name.trim()
      : ''

  if (!contactEmail?.includes('@')) {
    return { success: false, error: 'Bitte eine gültige E-Mail-Adresse für den Kundenkontakt angeben.' }
  }

  const orgId = String((profile as { organization_id?: string | null }).organization_id ?? '').trim()
  let vendorOrgName = company_name
  if (orgId) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle()
    vendorOrgName = String(orgRow?.name ?? '').trim() || company_name
  }

  let customerEmailSent = false
  try {
    const sent = await sendClientApprovalEmail({
      supabase,
      referenceId,
      ref,
      customerFacingName,
      vendorOrgName,
      contactEmail,
      firstName,
      companyName: company_name,
      internalReviewerId: user.id,
      sendResendToCustomer: true,
    })
    customerEmailSent = sent.emailSent
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Freigabe konnte nicht gespeichert werden.'
    return { success: false, error: msg }
  }

  await logEventForCurrentOrg({
    eventType: 'customer_approval_requested',
    referenceId,
    payload: {},
  })

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.references.detail(referenceId))
  revalidatePath(ROUTES.references.root)
  await revalidateOrgCachesForReference(referenceId)
  return { success: true, customerEmailSent, recipientEmail: contactEmail }
}

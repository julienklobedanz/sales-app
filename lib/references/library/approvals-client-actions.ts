'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { revalidateOrgCachesForReference } from '@/lib/cache/revalidate-org'
import { getAppOrigin } from '@/lib/env/app-origin'
import { asReferenceStatus, asTableUpdate } from '@/lib/supabase/db-types'
import { profileCanManageOrgData } from '@/lib/roles/profile-guards'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import {
  effectiveCustomerApprovalStatus,
  hasActiveCustomerApprovalWorkflow,
} from '@/lib/references/effective-customer-approval'
import { notifyInternalTeamApprovalWithdrawn } from '@/lib/references/approval-workflow-internal-notifications'
import {
  buildRefstackEmailHtml,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import { getApprovalResendClient } from '@/lib/references/library/approvals-client-email'
import { withdrawRestoredReferenceStatus } from '@/lib/references/library/approvals-helpers'
import type { ReferenceApprovalRow } from '@/lib/references/library/approvals-types'

export async function getApprovalLinkImpl(referenceId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('references')
    .select('approval_token, customer_approval_status, status')
    .eq('id', referenceId)
    .maybeSingle()
  const row = data as {
    approval_token?: string | null
    customer_approval_status?: string | null
    status?: string | null
  } | null
  const token = row?.approval_token
  if (!token) return null

  const effective = effectiveCustomerApprovalStatus(
    row?.customer_approval_status,
    row?.status,
  )
  if (effective !== 'pending' && effective !== 'approved') return null

  return `${getAppOrigin()}/approval/${token}`
}

export async function withdrawApprovalRequestImpl(
  referenceId: string,
): Promise<{ success: true }> {
  const supabase = await createServerSupabaseClient()
  const { data: refRow } = await supabase
    .from('references')
    .select(
      `
      title,
      company_id,
      organization_id,
      approval_reference_status_snapshot,
      approval_requested_by,
      approval_coordinator_email,
      companies ( name )
    `,
    )
    .eq('id', referenceId)
    .maybeSingle()

  const ref = refRow as {
    title?: string | null
    company_id?: string
    organization_id?: string | null
    approval_reference_status_snapshot?: string | null
    approval_requested_by?: string | null
    approval_coordinator_email?: string | null
    companies?: { name?: string } | { name?: string }[] | null
  } | null

  const restoredStatus = withdrawRestoredReferenceStatus(
    ref?.approval_reference_status_snapshot,
  )

  const company =
    Array.isArray(ref?.companies) && ref.companies.length > 0
      ? ref.companies[0]
      : (ref?.companies as { name?: string } | null)
  const companyName = company?.name?.trim() || 'Referenz'

  if (ref?.company_id) {
    void notifyInternalTeamApprovalWithdrawn({
      admin: supabase,
      referenceId,
      referenceTitle: String(ref.title ?? 'Referenz').trim() || 'Referenz',
      companyId: String(ref.company_id),
      companyName,
      organizationId: ref.organization_id ?? null,
      requesterId: ref.approval_requested_by ?? null,
      coordinatorEmail: ref.approval_coordinator_email ?? null,
    })
  }

  await supabase
    .from('references')
    .update({
      status: asReferenceStatus(restoredStatus),
      approval_token: null,
      customer_approval_status: null,
      approval_internal_status: 'pending_internal',
      approval_internal_review_token: null,
      approval_internal_reviewer_id: null,
      approval_internal_reviewed_at: null,
      approval_internal_review_comment: null,
      approval_requested_at: null,
      approval_requested_by: null,
      approval_requester_name: null,
      approval_responded_at: null,
      approval_comment: null,
      approval_contact_id: null,
      approval_external_contact_id: null,
      approval_delegated_to_name: null,
      approval_delegated_to_email: null,
      approval_message: null,
      approval_owner_name: null,
      approval_expires_at: null,
      approval_grace_until: null,
      approval_reference_status_snapshot: null,
      approval_coordinator_email: null,
      approval_coordinator_name: null,
      approval_customer_facing_name: null,
      approval_customer_last_sent_at: null,
      approval_customer_reminder_sent_at: null,
      approval_quote_approved: null,
      approval_quote_proposed: null,
      approval_consent_file_url: null,
    })
    .eq('id', referenceId)
  await supabase
    .from('approvals')
    .update({ status: 'rejected' })
    .eq('reference_id', referenceId)
    .eq('status', 'pending')
  revalidatePath(ROUTES.references.detail(referenceId))
  revalidatePath(ROUTES.references.root)
  revalidatePath(ROUTES.home)
  await revalidateOrgCachesForReference(referenceId)
  return { success: true }
}

export async function delegateClientApprovalImpl(params: {
  token: string
  delegateName?: string
  delegateEmail: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const token = params.token.trim()
  const email = params.delegateEmail.trim().toLowerCase()
  if (!token || !email.includes('@'))
    return { success: false, error: 'Ungültige Delegationsdaten.' }
  const { data: ref } = await supabase
    .from('references')
    .select(
      'id, title, approval_token, approval_delegated_to_name, approval_delegated_to_email',
    )
    .eq('approval_token', token)
    .maybeSingle()
  if (!ref) return { success: false, error: 'Link ungültig.' }
  await supabase
    .from('references')
    .update({
      approval_delegated_to_name: params.delegateName?.trim() || null,
      approval_delegated_to_email: email,
    })
    .eq('id', (ref as { id: string }).id)
  const resend = getApprovalResendClient()
  if (resend) {
    const approvalUrl = `${getAppOrigin()}/approval/${token}`
    const refTitle = String((ref as { title?: string }).title ?? 'Referenz')
    const html = buildRefstackEmailHtml({
      audience: 'external',
      badge: 'Delegierte Freigabe',
      bodyHtml: '<p style="margin:0;">Eine Referenz-Freigabe wurde an Sie delegiert.</p>',
      ctas: [{ label: 'Zur Freigabe-Seite', href: approvalUrl }],
      meta: { rows: [{ label: 'Referenz', value: refTitle }] },
    })
    await resend.emails.send({
      from: getRefstackResendFrom(),
      to: email,
      subject: `Weitergeleitete Freigabe: ${refTitle}`,
      html,
    })
  }
  return { success: true }
}

/** Neuen Freigabe-Token setzen (kein Resend — AM sendet den Link manuell). */
export async function resendClientApprovalEmailImpl(referenceId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht authentifiziert')

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role, function_role, full_name')
    .eq('id', user.id)
    .single()
  const { systemRole, functionRole } = parseProfileRoles(profile)
  const resenderName =
    typeof (profile as { full_name?: string } | null)?.full_name === 'string'
      ? (profile as { full_name: string }).full_name.trim()
      : ''

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
      approval_reference_status_snapshot,
      approval_requested_by,
      approval_requested_at,
      approval_contact_id,
      approval_external_contact_id,
      companies ( name )
    `,
    )
    .eq('id', referenceId)
    .single()

  if (fetchError || !row) throw new Error('Referenz nicht gefunden')

  const ref = row as unknown as ReferenceApprovalRow & {
    approval_requested_at?: string | null
  }

  if (!hasActiveCustomerApprovalWorkflow(ref.customer_approval_status, ref.status)) {
    throw new Error('Es liegt keine aktive Kunden-Freigabe vor.')
  }

  const canResend =
    profileCanManageOrgData(systemRole, functionRole) ||
    ref.approval_requested_by === user.id
  if (!canResend) {
    throw new Error('Keine Berechtigung, den Freigabe-Link zu erneuern.')
  }

  const newToken = crypto.randomUUID()

  const tokenPatch: Record<string, unknown> = {
    approval_token: newToken,
    approval_requested_at: new Date().toISOString(),
    customer_approval_status: 'pending',
    approval_responded_at: null,
  }
  if (resenderName) {
    tokenPatch.approval_customer_facing_name = resenderName
    tokenPatch.approval_coordinator_name = resenderName
  }

  const { error: updateError } = await supabase
    .from('references')
    .update(asTableUpdate<'references'>(tokenPatch))
    .eq('id', referenceId)

  if (updateError) throw new Error(updateError.message)

  await supabase
    .from('approvals')
    .update({ status: 'pending' })
    .eq('reference_id', referenceId)
    .in('status', ['approved', 'rejected'])

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.references.detail(referenceId))
  revalidatePath(ROUTES.references.root)
  await revalidateOrgCachesForReference(referenceId)
}

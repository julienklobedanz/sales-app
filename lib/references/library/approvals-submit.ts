'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { revalidateOrgCachesForReference } from '@/lib/cache/revalidate-org'
import type { SubmitForApprovalOptions } from '@/lib/references/library/approval-submit-types'
import { logEventForCurrentOrg } from '@/lib/events/log-event'
import { parseOrgPublicLinkPolicy } from '@/lib/organization-link-policy'
import { canStartApprovalWorkflow } from '@/lib/references/approval-workflow'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { isStaleInternalPending } from '@/lib/references/stale-internal-pending'
import { isApprovalRecipientEmail } from '@/lib/references/approval-recipient-input'
import {
  companyNameFromReferenceRow,
  referenceGiverNameFromRecipientEmail,
} from '@/lib/references/library/approvals-helpers'
import { computeApprovalStatusSnapshot } from '@/lib/references/library/approvals-snapshot'
import { notifyInternalReferenceCoordinatorAboutPendingReview } from '@/lib/references/library/approvals-internal-notify'
import { resolveContactForApproval } from '@/lib/references/library/approvals-recipient'
import type { ReferenceApprovalRow } from '@/lib/references/library/approvals-types'

export async function submitForApprovalImpl(
  id: string,
  options?: SubmitForApprovalOptions,
) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const { data: row, error: fetchError } = await supabase
    .from('references')
    .select(
      `
      title,
      status,
      company_id,
      contact_id,
      customer_contact_id,
      approval_contact_id,
      approval_external_contact_id,
      customer_approval_status,
      approval_internal_status,
      approval_requested_at,
      approval_reference_status_snapshot,
      approval_requested_by,
      approval_reference_giver_name,
      approval_reference_giver_title,
      approval_scope_named_mention,
      approval_scope_anonymous_mention,
      approval_scope_reference_call,
      approval_scope_logo_use,
      approval_scope_press_release,
      approval_competitor_blacklist,
      approval_quote_proposed,
      companies ( name )
    `,
    )
    .eq('id', id)
    .single()

  if (fetchError || !row) throw new Error('Referenz nicht gefunden')

  const ref = row as unknown as ReferenceApprovalRow & {
    approval_internal_status?: string | null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, system_role, function_role, organization_id')
    .eq('id', user.id)
    .maybeSingle()

  const { systemRole, functionRole } = parseProfileRoles(profile)

  const refStatus = String(ref.status ?? 'draft')
  const internalApproval = String(ref.approval_internal_status ?? '')
  const customerApproval = String(ref.customer_approval_status ?? '')
  const isApprovalGranted =
    customerApproval === 'approved' ||
    refStatus === 'approved' ||
    refStatus === 'external'
  const staleInternalPending = isStaleInternalPending({
    internalApprovalStatus: internalApproval,
    customerApprovalStatus: ref.customer_approval_status,
    referenceStatus: refStatus,
    approvalRequestedAt:
      (ref as { approval_requested_at?: string | null }).approval_requested_at ?? null,
  })

  if (
    !canStartApprovalWorkflow({
      systemRole,
      functionRole,
      referenceStatus: refStatus,
      internalApprovalStatus: internalApproval,
      customerApprovalStatus: ref.customer_approval_status,
      approvalRequestedAt:
        (ref as { approval_requested_at?: string | null }).approval_requested_at ?? null,
      staleInternalPending,
      isApprovalGranted,
    })
  ) {
    throw new Error(
      'Freigabe kann nur von der Referenz-Detailseite gestartet werden (Freigabestatus), wenn die Referenz den passenden Status hat (Entwurf bzw. nur intern für Sales).',
    )
  }
  const organizationId =
    typeof (profile as { organization_id?: string | null } | null)?.organization_id ===
    'string'
      ? (profile as { organization_id: string }).organization_id
      : null
  const requesterName =
    typeof (profile as { full_name?: string } | null)?.full_name === 'string'
      ? (profile as { full_name: string }).full_name.trim()
      : ''

  const accountManagerEmail = options?.accountManagerEmail?.trim() ?? ''
  if (!accountManagerEmail || !isApprovalRecipientEmail(accountManagerEmail)) {
    throw new Error('Bitte eine gültige E-Mail-Adresse des Account Managers angeben.')
  }

  let workflowSettingsUnknown: unknown = null
  if (organizationId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('workflow_settings')
      .eq('id', organizationId)
      .maybeSingle()
    workflowSettingsUnknown = org?.workflow_settings ?? null
  }

  const linkPolicy = parseOrgPublicLinkPolicy(workflowSettingsUnknown, 14)
  const defaultApprovalLinkDays = Math.max(1, Math.min(365, linkPolicy.defaultTtlDays))
  const explicitExpiryDays =
    options?.approvalExpiresInDays != null &&
    Number.isFinite(options.approvalExpiresInDays)
      ? Math.max(1, Math.min(365, Math.trunc(Number(options.approvalExpiresInDays))))
      : null
  const expiryDays = explicitExpiryDays ?? defaultApprovalLinkDays
  const expiresAtMs = Date.now() + expiryDays * 24 * 60 * 60 * 1000
  const expiresAtIso = new Date(expiresAtMs).toISOString()
  const graceUntilIso = new Date(expiresAtMs + 30 * 24 * 60 * 60 * 1000).toISOString()

  const resolvedRecipient = await resolveContactForApproval(
    supabase,
    ref,
    ref.company_id,
    options,
    { requireRecipientEmail: false },
  )
  const companyName = companyNameFromReferenceRow(ref.companies)

  const snapshot = computeApprovalStatusSnapshot(ref)

  const scope = options?.scope
  const ownerResolved =
    (options?.ownerName?.trim() ? options.ownerName.trim() : null) ??
    (requesterName.trim() ? requesterName.trim() : null)

  const internalReviewToken = crypto.randomUUID()

  const { error: updateError } = await supabase
    .from('references')
    .update({
      approval_token: null,
      customer_approval_status: null,
      approval_internal_status: 'pending_internal',
      approval_internal_review_token: internalReviewToken,
      approval_message: options?.message?.trim() ? options.message.trim() : null,
      approval_contact_id: resolvedRecipient.approvalContactId,
      approval_external_contact_id: resolvedRecipient.approvalExternalContactId,
      approval_requested_at: new Date().toISOString(),
      approval_requested_by: user.id,
      approval_requester_name: requesterName || null,
      approval_coordinator_email: accountManagerEmail,
      approval_coordinator_name:
        referenceGiverNameFromRecipientEmail(accountManagerEmail),
      approval_customer_facing_name: null,
      approval_internal_reviewer_id: null,
      approval_internal_reviewed_at: null,
      approval_reference_status_snapshot: snapshot,
      approval_owner_name: ownerResolved,
      approval_expires_at: expiresAtIso,
      approval_grace_until: graceUntilIso,
      approval_scope_named_mention: scope
        ? scope.namedMention
        : (ref.approval_scope_named_mention ?? true),
      approval_scope_anonymous_mention: scope
        ? scope.anonymousMention
        : (ref.approval_scope_anonymous_mention ?? true),
      approval_scope_reference_call: scope
        ? scope.referenceCall
        : (ref.approval_scope_reference_call ?? false),
      approval_scope_logo_use: scope
        ? scope.logoUse
        : (ref.approval_scope_logo_use ?? false),
      approval_scope_press_release: scope
        ? scope.pressRelease
        : (ref.approval_scope_press_release ?? false),
      approval_reference_giver_name:
        options?.referenceGiverName !== undefined
          ? options.referenceGiverName.trim() || null
          : (ref.approval_reference_giver_name ?? null),
      approval_reference_giver_title:
        options?.referenceGiverTitle !== undefined
          ? options.referenceGiverTitle.trim() || null
          : (ref.approval_reference_giver_title ?? null),
      approval_competitor_blacklist:
        options?.competitorBlacklist !== undefined
          ? options.competitorBlacklist
          : (ref.approval_competitor_blacklist ?? []),
      approval_quote_proposed:
        options?.proposedQuote !== undefined
          ? options.proposedQuote.trim() || null
          : (ref.approval_quote_proposed ?? null),
    })
    .eq('id', id)

  if (updateError) throw new Error(updateError.message)

  const { data: existing } = await supabase
    .from('approvals')
    .select('id')
    .eq('reference_id', id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!existing) {
    await supabase.from('approvals').insert({
      reference_id: id,
      requester_id: user.id,
      status: 'pending',
    })
  }

  await notifyInternalReferenceCoordinatorAboutPendingReview({
    supabase,
    referenceId: id,
    referenceTitle: ref.title,
    accountCompanyId: ref.company_id,
    accountCompanyName: companyName,
    requesterName,
    accountManagerEmail,
    message: options?.message?.trim() || null,
  })
  await logEventForCurrentOrg({
    eventType: 'internal_approval_requested',
    referenceId: id,
    payload: {},
  })

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.references.detail(id))
  revalidatePath(ROUTES.references.root)
  await revalidateOrgCachesForReference(id)
  return {
    success: true as const,
    stage: 'internal_review_pending' as const,
  }
}

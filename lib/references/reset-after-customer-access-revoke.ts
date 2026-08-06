import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

import { notifyInternalTeamCustomerAccessRevoked } from '@/lib/references/approval-workflow-internal-notifications'
import { log } from '@/lib/observability/logger'

export type CustomerAccessRevokeParams = {
  slug: string
  reasonLabel: string
  details?: string
}

/**
 * Nach Sperrlink: Kundenfreigabe zurücksetzen, interne Prüfung erneut anstoßen.
 */
export async function resetReferencesAfterCustomerAccessRevoke(
  admin: SupabaseClient,
  params: CustomerAccessRevokeParams,
): Promise<{ referenceIds: string[] }> {
  const { data: portfolio } = await admin
    .from('shared_portfolios')
    .select('id, reference_ids')
    .eq('slug', params.slug.trim())
    .maybeSingle()

  const referenceIds = Array.isArray(portfolio?.reference_ids)
    ? (portfolio.reference_ids as string[]).filter(Boolean)
    : []

  if (!referenceIds.length) {
    return { referenceIds: [] }
  }

  const { data: refOrgRow } = await admin
    .from('references')
    .select('organization_id')
    .eq('id', referenceIds[0]!)
    .maybeSingle()
  const organizationId =
    typeof refOrgRow?.organization_id === 'string' ? refOrgRow.organization_id : null

  const internalReviewToken = randomUUID()

  let updateQuery = admin
    .from('references')
    .update({
      customer_approval_status: 'revoked_by_customer',
      approval_internal_status: 'pending_internal',
      approval_internal_review_token: internalReviewToken,
      approval_internal_reviewer_id: null,
      approval_internal_reviewed_at: null,
      approval_token: null,
      approval_comment: null,
      approval_responded_at: null,
      approval_delegated_to_name: null,
      approval_delegated_to_email: null,
      approval_quote_approved: null,
      approval_quote_proposed: null,
    })
    .in('id', referenceIds)

  // E4: Org-Grenze zusätzlich zu Token/Slug-abgeleiteten IDs.
  if (organizationId) {
    updateQuery = updateQuery.eq('organization_id', organizationId)
  } else {
    log.error('missing organization_id for revoke reset', {
      action: 'resetReferencesAfterCustomerAccessRevoke.missingOrg',
      slug: params.slug,
    })
    return { referenceIds: [] }
  }

  const { error: updateError } = await updateQuery
  if (updateError) {
    log.error(
      'update failed',
      {
        action: 'resetReferencesAfterCustomerAccessRevoke.update',
        message: updateError.message,
      },
      updateError,
    )
    return { referenceIds: [] }
  }

  if (organizationId) {
    const events = referenceIds.map((referenceId) => ({
      organization_id: organizationId,
      reference_id: referenceId,
      event_type: 'customer_access_revoked',
      payload: {
        reason: params.reasonLabel,
        details: params.details?.trim() || null,
        slug: params.slug.trim(),
      },
      created_by: null,
    }))
    const { error: eventError } = await admin.from('evidence_events').insert(events)
    if (eventError) {
      log.error(
        'event log failed',
        {
          action: 'resetReferencesAfterCustomerAccessRevoke.eventLog',
          message: eventError.message,
        },
        eventError,
      )
    }
  }

  for (const referenceId of referenceIds) {
    void notifyInternalTeamCustomerAccessRevoked({
      admin,
      referenceId,
      reasonLabel: params.reasonLabel,
      details: params.details,
    })
  }

  await admin
    .from('approvals')
    .update({ status: 'pending' })
    .in('reference_id', referenceIds)
    .in('status', ['approved', 'rejected'])

  return { referenceIds }
}

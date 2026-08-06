import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

import { notifyInternalTeamInternalApproved } from '@/lib/references/approval-workflow-internal-notifications'

export type ConfirmInternalApprovalResult =
  | {
      success: true
      referenceId: string
      referenceTitle: string
      alreadyApproved: boolean
    }
  | { success: false; reason: 'invalid' | 'not_pending' }

export async function confirmInternalApprovalFromToken(
  admin: SupabaseClient<Database>,
  token: string,
): Promise<ConfirmInternalApprovalResult> {
  const trimmed = token.trim()
  if (!trimmed) return { success: false, reason: 'invalid' }

  const { data: row, error } = await admin
    .from('references')
    .select(
      'id, title, organization_id, approval_internal_status, approval_internal_review_token',
    )
    .eq('approval_internal_review_token', trimmed)
    .maybeSingle()

  if (error || !row?.id) return { success: false, reason: 'invalid' }

  const internal = String(row.approval_internal_status ?? '').toLowerCase()
  if (internal === 'approved_internal') {
    return {
      success: true,
      referenceId: row.id,
      referenceTitle: String(row.title ?? 'Referenz'),
      alreadyApproved: true,
    }
  }

  if (internal !== 'pending_internal') {
    return { success: false, reason: 'not_pending' }
  }

  const { error: updateError } = await admin
    .from('references')
    .update({
      approval_internal_status: 'approved_internal',
      approval_internal_reviewed_at: new Date().toISOString(),
      approval_internal_review_token: null,
    })
    .eq('id', row.id)
    .eq('approval_internal_status', 'pending_internal')

  if (updateError) return { success: false, reason: 'invalid' }

  const orgId = row.organization_id
  if (orgId) {
    try {
      await admin.from('evidence_events').insert({
        organization_id: orgId,
        event_type: 'internal_approval_decided',
        reference_id: row.id,
        payload: { decision: 'approved_internal', source: 'email_link' },
      })
    } catch {
      /* best effort */
    }
  }

  void notifyInternalTeamInternalApproved({
    admin,
    referenceId: row.id,
  })

  return {
    success: true,
    referenceId: row.id,
    referenceTitle: String(row.title ?? 'Referenz'),
    alreadyApproved: false,
  }
}

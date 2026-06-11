import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export type ConfirmInternalApprovalResult =
  | {
      ok: true
      referenceId: string
      referenceTitle: string
      alreadyApproved: boolean
    }
  | { ok: false; reason: 'invalid' | 'not_pending' }

export async function confirmInternalApprovalFromToken(
  admin: SupabaseClient,
  token: string
): Promise<ConfirmInternalApprovalResult> {
  const trimmed = token.trim()
  if (!trimmed) return { ok: false, reason: 'invalid' }

  const { data: row, error } = await admin
    .from('references')
    .select('id, title, organization_id, approval_internal_status, approval_internal_review_token')
    .eq('approval_internal_review_token', trimmed)
    .maybeSingle()

  if (error || !row?.id) return { ok: false, reason: 'invalid' }

  const internal = String(row.approval_internal_status ?? '').toLowerCase()
  if (internal === 'approved_internal') {
    return {
      ok: true,
      referenceId: row.id as string,
      referenceTitle: String(row.title ?? 'Referenz'),
      alreadyApproved: true,
    }
  }

  if (internal !== 'pending_internal') {
    return { ok: false, reason: 'not_pending' }
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

  if (updateError) return { ok: false, reason: 'invalid' }

  const orgId = (row as { organization_id?: string | null }).organization_id
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

  return {
    ok: true,
    referenceId: row.id as string,
    referenceTitle: String(row.title ?? 'Referenz'),
    alreadyApproved: false,
  }
}

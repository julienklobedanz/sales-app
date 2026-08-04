import 'server-only'

import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

import { deriveReferenceGiverNameFromEmail } from '@/lib/references/derive-reference-giver-name-from-email'
import { sendInternalApprovalReviewEmail } from '@/lib/references/internal-approval-email'
import { isApprovalRecipientEmail } from '@/lib/references/approval-recipient-input'

export type DelegateInternalApprovalResult =
  | { ok: true; delegatedToEmail: string; emailSent: boolean }
  | { ok: false; reason: 'invalid' | 'not_pending' | 'invalid_email' }

export async function delegateInternalApprovalFromToken(
  admin: SupabaseClient,
  token: string,
  delegateEmail: string,
): Promise<DelegateInternalApprovalResult> {
  const trimmedToken = token.trim()
  const email = delegateEmail.trim().toLowerCase()
  if (!trimmedToken) return { ok: false, reason: 'invalid' }
  if (!isApprovalRecipientEmail(email)) return { ok: false, reason: 'invalid_email' }

  const { data: row, error } = await admin
    .from('references')
    .select(
      `
      id,
      title,
      organization_id,
      approval_internal_status,
      approval_internal_review_token,
      approval_requester_name,
      approval_message,
      approval_coordinator_email,
      companies ( name )
    `,
    )
    .eq('approval_internal_review_token', trimmedToken)
    .maybeSingle()

  if (error || !row?.id) return { ok: false, reason: 'invalid' }

  const internal = String(row.approval_internal_status ?? '').toLowerCase()
  if (internal !== 'pending_internal') return { ok: false, reason: 'not_pending' }

  const newToken = randomUUID()
  const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
  const accountCompanyName =
    typeof company?.name === 'string' && company.name.trim()
      ? company.name.trim()
      : 'Account'
  const requesterName = String(row.approval_requester_name ?? '').trim()
  const previousEmail = String(row.approval_coordinator_email ?? '').trim()

  const { error: updateError } = await admin
    .from('references')
    .update({
      approval_coordinator_email: email,
      approval_coordinator_name: deriveReferenceGiverNameFromEmail(email),
      approval_internal_review_token: newToken,
    })
    .eq('id', row.id)
    .eq('approval_internal_status', 'pending_internal')

  if (updateError) return { ok: false, reason: 'invalid' }

  const orgId = (row as { organization_id?: string | null }).organization_id
  if (orgId) {
    try {
      await admin.from('evidence_events').insert({
        organization_id: orgId,
        event_type: 'internal_approval_requested',
        reference_id: row.id,
        payload: {
          delegated: true,
          from_email: previousEmail || null,
          to_email: email,
        },
        created_by: null,
      })
    } catch {
      /* best effort */
    }
  }

  const delegateName = deriveReferenceGiverNameFromEmail(email)
  const emailSent = await sendInternalApprovalReviewEmail({
    to: email,
    greeting: delegateName ? `Hallo ${delegateName},` : 'Hallo,',
    referenceTitle: String(row.title ?? 'Referenz'),
    accountCompanyName,
    requesterName,
    message: typeof row.approval_message === 'string' ? row.approval_message : null,
    internalReviewToken: newToken,
    referenceId: row.id as string,
  })

  return { ok: true, delegatedToEmail: email, emailSent }
}

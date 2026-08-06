import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export type InternalApprovalPageContext =
  | {
      success: true
      referenceId: string
      referenceTitle: string
      accountCompanyName: string
      requesterName: string
      message: string | null
      coordinatorEmail: string | null
      alreadyApproved: boolean
      canAct: boolean
    }
  | { success: false; reason: 'invalid' | 'not_pending' }

export async function getInternalApprovalPageContext(
  admin: SupabaseClient,
  token: string,
): Promise<InternalApprovalPageContext> {
  const trimmed = token.trim()
  if (!trimmed) return { success: false, reason: 'invalid' }

  const { data: row, error } = await admin
    .from('references')
    .select(
      `
      id,
      title,
      approval_internal_status,
      approval_internal_review_token,
      approval_requester_name,
      approval_message,
      approval_coordinator_email,
      companies ( name )
    `,
    )
    .eq('approval_internal_review_token', trimmed)
    .maybeSingle()

  if (error || !row?.id) return { success: false, reason: 'invalid' }

  const internal = String(row.approval_internal_status ?? '').toLowerCase()
  const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
  const accountCompanyName =
    typeof company?.name === 'string' && company.name.trim()
      ? company.name.trim()
      : 'Account'

  if (internal === 'approved_internal') {
    return {
      success: true,
      referenceId: row.id as string,
      referenceTitle: String(row.title ?? 'Referenz'),
      accountCompanyName,
      requesterName: String(row.approval_requester_name ?? '').trim(),
      message: typeof row.approval_message === 'string' ? row.approval_message : null,
      coordinatorEmail:
        typeof row.approval_coordinator_email === 'string'
          ? row.approval_coordinator_email
          : null,
      alreadyApproved: true,
      canAct: false,
    }
  }

  if (internal !== 'pending_internal') {
    return { success: false, reason: 'not_pending' }
  }

  return {
    success: true,
    referenceId: row.id as string,
    referenceTitle: String(row.title ?? 'Referenz'),
    accountCompanyName,
    requesterName: String(row.approval_requester_name ?? '').trim(),
    message: typeof row.approval_message === 'string' ? row.approval_message : null,
    coordinatorEmail:
      typeof row.approval_coordinator_email === 'string'
        ? row.approval_coordinator_email
        : null,
    alreadyApproved: false,
    canAct: true,
  }
}

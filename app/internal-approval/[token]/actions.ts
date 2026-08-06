'use server'

import { confirmInternalApprovalFromToken } from '@/lib/references/complete-internal-approval'
import { delegateInternalApprovalFromToken } from '@/lib/references/delegate-internal-approval'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export type ConfirmInternalApprovalActionResult =
  | { success: true; referenceId: string; alreadyApproved: boolean }
  | { success: false; error: string }

export type DelegateInternalApprovalActionResult =
  | { success: true; delegatedToEmail: string; emailSent: boolean }
  | { success: false; error: string }

export async function confirmInternalApprovalAction(
  token: string,
): Promise<ConfirmInternalApprovalActionResult> {
  // Service-Role weil: interner Freigabe-Link ohne Dashboard-Session.
  // Grenze: confirmInternalApprovalFromToken validiert approval_internal_review_token.
  const admin = createServiceRoleSupabaseClient()
  if (!admin) return { success: false, error: 'server_config' }

  const result = await confirmInternalApprovalFromToken(admin, token)
  if (!result.success) {
    return {
      success: false,
      error:
        result.reason === 'not_pending'
          ? 'Diese interne Freigabe ist nicht mehr ausstehend.'
          : 'Link ungültig oder abgelaufen.',
    }
  }

  return {
    success: true,
    referenceId: result.referenceId,
    alreadyApproved: result.alreadyApproved,
  }
}

export async function delegateInternalApprovalAction(
  token: string,
  delegateEmail: string,
): Promise<DelegateInternalApprovalActionResult> {
  // Service-Role weil: Delegation per Token-Link ohne Session.
  // Grenze: delegateInternalApprovalFromToken validiert Token + pending_internal.
  const admin = createServiceRoleSupabaseClient()
  if (!admin) return { success: false, error: 'server_config' }

  const result = await delegateInternalApprovalFromToken(admin, token, delegateEmail)
  if (!result.success) {
    if (result.reason === 'invalid_email') {
      return { success: false, error: 'Bitte eine gültige E-Mail-Adresse eingeben.' }
    }
    if (result.reason === 'not_pending') {
      return {
        success: false,
        error: 'Diese interne Freigabe ist nicht mehr ausstehend.',
      }
    }
    return { success: false, error: 'Link ungültig oder abgelaufen.' }
  }

  return {
    success: true,
    delegatedToEmail: result.delegatedToEmail,
    emailSent: result.emailSent,
  }
}

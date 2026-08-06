'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { revalidateOrgCachesForReference } from '@/lib/cache/revalidate-org'
import { getAppOrigin } from '@/lib/env/app-origin'
import { logEventForCurrentOrg } from '@/lib/events/log-event'
import { profileCanManageOrgData } from '@/lib/roles/profile-guards'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { hasActiveCustomerApprovalWorkflow } from '@/lib/references/effective-customer-approval'
import { referenceHasOpenCustomerChangeRequests } from '@/lib/references/approval-change-requests'
import { markCustomerApprovalEmailSent } from '@/lib/references/customer-approval-reminder'
import {
  isResendSandboxRecipientError,
  resolveResendRecipient,
  shouldMockResendSend,
} from '@/lib/email/resend-dev-override'
import { getRefstackResendFrom } from '@/lib/email/refstack-email-layout'
import { log } from '@/lib/observability/logger'
import { companyNameFromReferenceRow } from '@/lib/references/library/approvals-helpers'
import { buildFollowUpApprovalAfterChangesEmailHtml } from '@/lib/references/library/approvals-email-templates'
import { getApprovalResendClient } from '@/lib/references/library/approvals-client-email'
import { resolveContactForApproval } from '@/lib/references/library/approvals-recipient'
import type { RequestCustomerApprovalAgainResult } from '@/lib/references/library/approvals-types'

export async function requestCustomerApprovalAgainAfterChangesImpl(
  referenceId: string,
): Promise<RequestCustomerApprovalAgainResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht authentifiziert' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role, function_role, organization_id')
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
      approval_token,
      approval_requested_by,
      approval_contact_id,
      approval_external_contact_id,
      approval_delegated_to_name,
      approval_delegated_to_email,
      approval_comment,
      companies ( name )
    `,
    )
    .eq('id', referenceId)
    .single()

  if (fetchError || !row) return { success: false, error: 'Referenz nicht gefunden' }

  const ref = row

  if (!hasActiveCustomerApprovalWorkflow(ref.customer_approval_status, ref.status)) {
    return { success: false, error: 'Es liegt keine aktive Kunden-Freigabe vor.' }
  }

  const hasChanges = await referenceHasOpenCustomerChangeRequests(
    supabase,
    referenceId,
    ref.customer_approval_status,
    ref.approval_comment,
  )
  if (!hasChanges) {
    return {
      success: false,
      error: 'Es liegen keine offenen Änderungswünsche vom Kunden vor.',
    }
  }

  const canSend =
    profileCanManageOrgData(systemRole, functionRole) ||
    ref.approval_requested_by === user.id
  if (!canSend) {
    return {
      success: false,
      error: 'Keine Berechtigung, die Freigabe erneut anzufragen.',
    }
  }

  const token = typeof ref.approval_token === 'string' ? ref.approval_token.trim() : ''
  if (!token) return { success: false, error: 'Noch kein Freigabelink verfügbar.' }

  const companyName = companyNameFromReferenceRow(ref.companies)

  let contactEmail: string
  let firstName: string
  const delegatedEmail =
    typeof ref.approval_delegated_to_email === 'string'
      ? ref.approval_delegated_to_email.trim()
      : ''
  if (delegatedEmail.includes('@')) {
    contactEmail = delegatedEmail
    firstName =
      typeof ref.approval_delegated_to_name === 'string'
        ? ref.approval_delegated_to_name.trim()
        : ''
  } else {
    try {
      const resolved = await resolveContactForApproval(
        supabase,
        ref,
        ref.company_id,
        {},
        { requireRecipientEmail: true },
      )
      contactEmail = resolved.email
      firstName = resolved.firstName
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Kein gültiger Empfänger für die Freigabe.'
      return { success: false, error: msg }
    }
  }

  const approvalUrl = `${getAppOrigin()}/approval/${token}`
  const recipient = resolveResendRecipient(contactEmail)
  const fromAddress = getRefstackResendFrom()
  let emailMocked = false

  if (shouldMockResendSend()) {
    log.warn('RESEND_MOCK_SUCCESS — email not sent (dev test)', {
      action: 'requestCustomerApprovalAgainAfterChanges.mock',
    })
    emailMocked = true
  } else {
    const resend = getApprovalResendClient()
    if (!resend) {
      return {
        success: false,
        error: 'E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY).',
      }
    }

    try {
      const { error: sendError } = await resend.emails.send({
        from: fromAddress,
        to: recipient.to,
        subject: `Aktualisierte Referenz zur Freigabe: ${companyName}`,
        html: buildFollowUpApprovalAfterChangesEmailHtml({
          firstName,
          companyName,
          refTitle: ref.title,
          approvalUrl,
        }),
      })
      if (sendError) {
        if (
          process.env.NODE_ENV === 'development' &&
          isResendSandboxRecipientError(sendError.message)
        ) {
          log.warn('Resend sandbox blocked — treated as success in dev', {
            action: 'requestCustomerApprovalAgainAfterChanges.sandbox',
            message: sendError.message,
          })
          emailMocked = true
        } else {
          log.error(
            'send failed',
            { action: 'requestCustomerApprovalAgainAfterChanges.send' },
            sendError,
          )
          const hint =
            process.env.NODE_ENV === 'development'
              ? ' Für Tests: RESEND_MOCK_SUCCESS=true oder RESEND_DEV_OVERRIDE_TO=julien.klobedanz@gmail.com in .env.local.'
              : ''
          return {
            success: false,
            error: `E-Mail konnte nicht gesendet werden: ${sendError.message}.${hint}`,
          }
        }
      }
    } catch (e) {
      log.error(
        'send failed',
        { action: 'requestCustomerApprovalAgainAfterChanges.send' },
        e,
      )
      return { success: false, error: 'E-Mail konnte nicht gesendet werden.' }
    }
  }

  const { error: clearCommentError } = await supabase
    .from('references')
    .update({ approval_comment: null })
    .eq('id', referenceId)
  if (clearCommentError) {
    log.error(
      'clear comment failed',
      {
        action: 'requestCustomerApprovalAgainAfterChanges.clearComment',
        message: clearCommentError.message,
      },
      clearCommentError,
    )
    return {
      success: false,
      error:
        'E-Mail wurde gesendet, aber die Änderungswünsche konnten nicht zurückgesetzt werden.',
    }
  }

  if (!emailMocked) {
    await markCustomerApprovalEmailSent(supabase, referenceId)
  }

  await logEventForCurrentOrg({
    eventType: 'customer_approval_requested',
    referenceId,
    payload: { after_changes: true, recipient_email: contactEmail },
  })

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.references.detail(referenceId))
  revalidatePath(ROUTES.references.root)
  await revalidateOrgCachesForReference(referenceId)
  return {
    success: true,
    emailSent: !emailMocked,
    emailMocked,
    recipientEmail: recipient.to,
    devRedirected: recipient.devRedirected,
    originalRecipientEmail: recipient.devRedirected ? recipient.originalTo : undefined,
  }
}

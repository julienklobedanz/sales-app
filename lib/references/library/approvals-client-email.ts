import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'

import { getAppOrigin } from '@/lib/env/app-origin'
import { buildClientApprovalEmailHtml } from '@/lib/references/library/approvals-email-templates'
import { getPortfolioManageAndPreviewUrlsForApprovalEmail } from '@/lib/references/library/sharing'
import {
  escapeRefstackEmailHtml,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import { markCustomerApprovalEmailSent } from '@/lib/references/customer-approval-reminder'
import { log } from '@/lib/observability/logger'

export function getApprovalResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function sendClientApprovalEmail(args: {
  supabase: SupabaseClient
  referenceId: string
  ref: { title: string }
  /** AM-Name für Kundenkommunikation (nicht der interne Anfragende). */
  customerFacingName: string
  vendorOrgName: string
  contactEmail: string
  firstName: string
  companyName: string
  /** Gleiches Update wie Token/Freigabe: interne Freigabe inkl. Prüfer (ohne zweites Roundtrip). */
  internalReviewerId?: string | null
  /**
   * Wenn false (Standard): kein Resend an den Kunden — Account Manager stellt den Kontakt her und sendet den Link manuell.
   */
  sendResendToCustomer?: boolean
}): Promise<{ success: boolean; token: string; emailSent: boolean }> {
  const newToken = crypto.randomUUID()
  const customerFacingName = args.customerFacingName.trim()
  const patch: {
    approval_token: string
    customer_approval_status: string
    approval_internal_reviewer_id?: string
    approval_customer_facing_name?: string | null
    approval_coordinator_name?: string | null
  } = {
    approval_token: newToken,
    customer_approval_status: 'pending',
    approval_customer_facing_name: customerFacingName || null,
    approval_coordinator_name: customerFacingName || null,
  }
  if (args.internalReviewerId) {
    patch.approval_internal_reviewer_id = args.internalReviewerId
  }
  const { error: updateError } = await args.supabase
    .from('references')
    .update(patch)
    .eq('id', args.referenceId)
  if (updateError) throw new Error(updateError.message)

  const resend = getApprovalResendClient()
  const sendMail = args.sendResendToCustomer === true
  let emailSent = false
  if (args.contactEmail && resend && sendMail) {
    const vendorOrg = args.vendorOrgName.trim() || 'uns'
    const requesterBlock = customerFacingName
      ? `<p style="margin:0 0 16px;"><strong>${escapeRefstackEmailHtml(customerFacingName)}</strong> von ${escapeRefstackEmailHtml(vendorOrg)} bittet Sie um Freigabe dieser Referenz.</p>`
      : `<p style="margin:0 0 16px;"><strong>${escapeRefstackEmailHtml(vendorOrg)}</strong> bittet Sie um Freigabe dieser Referenz.</p>`
    let portfolio: { manageUrl: string; publicPreviewUrl: string } | null = null
    try {
      portfolio = await getPortfolioManageAndPreviewUrlsForApprovalEmail(
        args.supabase,
        args.referenceId,
      )
    } catch (e) {
      log.error(
        'portfolio links failed',
        { action: 'sendClientApprovalEmail.portfolioLinks' },
        e,
      )
    }
    const approvalUrl = `${getAppOrigin()}/approval/${newToken}`
    try {
      await resend.emails.send({
        from: getRefstackResendFrom(),
        to: args.contactEmail,
        subject: `Freigabe-Anfrage: ${args.companyName} – ${args.ref.title}`,
        html: buildClientApprovalEmailHtml({
          firstName: args.firstName,
          requesterBlock,
          companyName: args.companyName,
          refTitle: args.ref.title,
          approvalUrl,
          portfolio,
        }),
      })
      emailSent = true
      await markCustomerApprovalEmailSent(args.supabase, args.referenceId)
    } catch (e) {
      log.error('email send failed', { action: 'sendClientApprovalEmail.send' }, e)
    }
  }
  return { success: true, token: newToken, emailSent }
}

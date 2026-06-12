import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildConfirmationPortfolioSupplementalHtml,
  buildRefstackEmailHtml,
  buildReferenceMetaRows,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import { getAppOrigin } from '@/lib/env/app-origin'
import { getPortfolioManageAndPreviewUrlsForApprovalEmail } from '@/app/dashboard/references/sharing'

function buildConfirmationEmailHtml(args: {
  firstName: string
  companyName: string
  refTitle: string
  approvalUrl: string
  isUpdate: boolean
  portfolio: { manageUrl: string; publicPreviewUrl: string } | null
}): string {
  const intro = args.isUpdate
    ? 'Ihre Änderungen an der Referenz-Freigabe wurden gespeichert.'
    : 'Vielen Dank — Ihre Freigabe wurde erfolgreich erteilt.'

  const greeting = args.firstName.trim() ? `Hallo ${args.firstName.trim()}!` : 'Hallo!'

  return buildRefstackEmailHtml({
    audience: 'external',
    badge: args.isUpdate ? 'Freigabe angepasst' : 'Freigabe bestätigt',
    greeting,
    bodyHtml: `<p style="margin:0 0 16px;">${intro}</p>`,
    meta: {
      rows: buildReferenceMetaRows(args.refTitle, args.companyName),
    },
    ctas: [{ label: 'Freigabe ansehen oder anpassen', href: args.approvalUrl }],
    supplementalHtml: args.portfolio ? buildConfirmationPortfolioSupplementalHtml(args.portfolio) : undefined,
  })
}

type RecipientRow = {
  approval_contact_id: string | null
  approval_external_contact_id: string | null
  approval_delegated_to_email: string | null
  approval_delegated_to_name: string | null
}

async function resolveApprovalRecipient(
  admin: SupabaseClient,
  ref: RecipientRow
): Promise<{ email: string; firstName: string } | null> {
  const delegatedEmail =
    typeof ref.approval_delegated_to_email === 'string' ? ref.approval_delegated_to_email.trim() : ''
  if (delegatedEmail.includes('@')) {
    const name =
      typeof ref.approval_delegated_to_name === 'string' ? ref.approval_delegated_to_name.trim() : ''
    return { email: delegatedEmail, firstName: name }
  }

  if (ref.approval_external_contact_id) {
    const { data } = await admin
      .from('external_contacts')
      .select('email, first_name')
      .eq('id', ref.approval_external_contact_id)
      .maybeSingle()
    const email = typeof data?.email === 'string' ? data.email.trim() : ''
    if (email.includes('@')) {
      const firstName = typeof data?.first_name === 'string' ? data.first_name.trim() : ''
      return { email, firstName }
    }
  }

  if (ref.approval_contact_id) {
    const { data } = await admin
      .from('contacts')
      .select('email, first_name')
      .eq('id', ref.approval_contact_id)
      .maybeSingle()
    const email = typeof data?.email === 'string' ? data.email.trim() : ''
    if (email.includes('@')) {
      const firstName = typeof data?.first_name === 'string' ? data.first_name.trim() : ''
      return { email, firstName }
    }
  }

  return null
}

export async function sendClientApprovalConfirmationEmail(args: {
  admin: SupabaseClient
  referenceId: string
  refTitle: string
  companyName: string
  approvalToken: string
  isUpdate: boolean
  recipient: RecipientRow
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return false

  const recipient = await resolveApprovalRecipient(args.admin, args.recipient)
  if (!recipient) return false

  let portfolio: { manageUrl: string; publicPreviewUrl: string } | null = null
  try {
    portfolio = await getPortfolioManageAndPreviewUrlsForApprovalEmail(args.admin, args.referenceId)
  } catch (e) {
    console.error('[sendClientApprovalConfirmationEmail] portfolio links:', e)
  }

  const approvalUrl = `${getAppOrigin()}/approval/${args.approvalToken}`
  const subject = args.isUpdate
    ? `Bestätigung: Änderungen an Ihrer Referenz-Freigabe – ${args.companyName}`
    : `Bestätigung Ihrer Referenz-Freigabe – ${args.companyName}`

  try {
    const resend = new Resend(key)
    await resend.emails.send({
      from: getRefstackResendFrom(),
      to: recipient.email,
      subject,
      html: buildConfirmationEmailHtml({
        firstName: recipient.firstName,
        companyName: args.companyName,
        refTitle: args.refTitle,
        approvalUrl,
        isUpdate: args.isUpdate,
        portfolio,
      }),
    })
    return true
  } catch (e) {
    console.error('[sendClientApprovalConfirmationEmail] send failed:', e)
    return false
  }
}

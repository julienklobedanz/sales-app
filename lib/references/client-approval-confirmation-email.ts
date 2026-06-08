import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAppOrigin } from '@/lib/env/app-origin'
import { getPortfolioManageAndPreviewUrlsForApprovalEmail } from '@/app/dashboard/references/sharing'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

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

  const portfolioSection = args.portfolio
    ? `
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
          <h2 style="font-size:16px;margin:0 0 12px;">Ihre persönlichen Links</h2>
          <p style="margin:0 0 12px;line-height:1.5;">Mit dem <strong>ersten Link</strong> können Sie Ihre Freigabe und Anmerkungen jederzeit anpassen. Der <strong>zweite Link</strong> zeigt die Kundenansicht und ermöglicht Ihnen, den öffentlichen Zugriff bei Bedarf <strong>sofort zu sperren</strong>. Bitte den zweiten Link nicht an Dritte weiterleiten.</p>
          <p style="margin:0 0 16px;"><a href="${escapeHtml(args.portfolio.manageUrl)}"
            style="display:inline-block;background:#b45309;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:600;">
            Persönlicher Sperrlink
          </a></p>
          <p style="font-size:13px;color:#64748b;margin:0;line-height:1.5;">Öffentliche Kundenansicht ohne Sperrrecht:<br/>
          <a href="${escapeHtml(args.portfolio.publicPreviewUrl)}" style="color:#2563eb;word-break:break-all;">${escapeHtml(args.portfolio.publicPreviewUrl)}</a></p>
        `
    : ''

  return `
          <h1 style="font-size:20px;">Hallo${args.firstName ? ` ${escapeHtml(args.firstName)}` : ''}!</h1>
          <p>${intro}</p>
          <p>Referenz: <em>"${escapeHtml(args.refTitle)}"</em> (${escapeHtml(args.companyName)})</p>
          <p style="margin:16px 0;"><a href="${escapeHtml(args.approvalUrl)}"
            style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:600;">
            Freigabe ansehen oder anpassen
          </a></p>
          ${portfolioSection}
        `
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
      from: 'Refstack <onboarding@resend.dev>',
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

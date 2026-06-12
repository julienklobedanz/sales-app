import { Resend } from 'resend'

import { getAppOrigin } from '@/lib/env/app-origin'
import { ROUTES } from '@/lib/routes'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export type InternalApprovalReviewEmailParams = {
  to: string
  greeting?: string
  referenceTitle: string
  accountCompanyName: string
  requesterName: string
  message?: string | null
  internalReviewToken: string
  referenceId: string
}

/** E-Mail an den intern Verantwortlichen mit Link zur internen Freigabe (inkl. Delegation). */
export async function sendInternalApprovalReviewEmail(
  params: InternalApprovalReviewEmailParams
): Promise<boolean> {
  const resend = getResend()
  const to = params.to.trim()
  if (!resend || !to.toLowerCase().includes('@')) return false

  const greeting = params.greeting?.trim() || 'Hallo,'
  const approveUrl = `${getAppOrigin()}${ROUTES.internalApproval(params.internalReviewToken)}`
  const detailUrl = `${getAppOrigin()}${ROUTES.evidence.detail(params.referenceId)}`
  const who = params.requesterName.trim()
    ? `<p><strong>${escapeHtml(params.requesterName.trim())}</strong> hat eine Kundenfreigabe zur internen Prüfung eingereicht.</p>`
    : '<p>Es liegt eine neue Freigabe zur internen Prüfung vor.</p>'
  const messageBlock = params.message?.trim()
    ? `<p><strong>Nachricht:</strong><br/>${escapeHtml(params.message.trim()).replace(/\n/g, '<br/>')}</p>`
    : ''

  try {
    await resend.emails.send({
      from: 'Refstack <onboarding@resend.dev>',
      to,
      subject: `Interne Referenzfreigabe: ${params.accountCompanyName} – ${params.referenceTitle}`,
      html: `
        ${greeting}
        ${who}
        <p>Referenz: <strong>${escapeHtml(params.referenceTitle)}</strong><br/>
        Account: <strong>${escapeHtml(params.accountCompanyName)}</strong></p>
        ${messageBlock}
        <p>Bitte bestätigen Sie die interne Freigabe oder delegieren Sie sie an eine andere Person. Erst danach kann in RefStack die Kundenfreigabe vorbereitet werden.</p>
        <p style="margin:20px 0;"><a href="${escapeHtml(approveUrl)}"
          style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:600;">
          Zur internen Freigabe
        </a></p>
        <p style="font-size:13px;color:#64748b;">Auf der Freigabeseite können Sie die Prüfung bestätigen oder die Verantwortung an eine andere E-Mail-Adresse übergeben.</p>
        <p style="font-size:13px;color:#64748b;">Referenz in RefStack öffnen:<br/>
        <a href="${escapeHtml(detailUrl)}" style="color:#2563eb;">${escapeHtml(detailUrl)}</a></p>
      `,
    })
    return true
  } catch (e) {
    console.error('[sendInternalApprovalReviewEmail]', e)
    return false
  }
}

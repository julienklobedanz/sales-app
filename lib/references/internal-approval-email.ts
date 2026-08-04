import { Resend } from 'resend'

import {
  buildRefstackEmailHtml,
  buildReferenceMetaRows,
  escapeRefstackEmailHtml,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import { getAppOrigin } from '@/lib/env/app-origin'
import { ROUTES } from '@/lib/routes'
import { log } from '@/lib/observability/logger'

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
  const detailUrl = `${getAppOrigin()}${ROUTES.references.detail(params.referenceId)}`

  const who = params.requesterName.trim()
    ? `<p style="margin:0 0 16px;"><strong>${escapeRefstackEmailHtml(params.requesterName.trim())}</strong> hat eine Kundenfreigabe zur internen Prüfung eingereicht.</p>`
    : '<p style="margin:0 0 16px;">Es liegt eine neue Freigabe zur internen Prüfung vor.</p>'

  const messageBlock = params.message?.trim()
    ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#334155;"><strong>Nachricht:</strong><br/>${escapeRefstackEmailHtml(params.message.trim()).replace(/\n/g, '<br/>')}</p>`
    : ''

  const html = buildRefstackEmailHtml({
    audience: 'internal',
    badge: 'Interne Freigabe',
    greeting,
    bodyHtml: `${who}
      <p style="margin:0 0 16px;">Bitte bestätigen Sie die interne Freigabe oder delegieren Sie sie an eine andere Person. Erst danach kann in RefStack die Kundenfreigabe vorbereitet werden.</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Auf der Freigabeseite können Sie die Prüfung bestätigen oder die Verantwortung an eine andere E-Mail-Adresse übergeben.</p>`,
    meta: {
      rows: buildReferenceMetaRows(params.referenceTitle, params.accountCompanyName),
      extraHtml: messageBlock,
    },
    ctas: [{ label: 'Zur internen Freigabe', href: approveUrl }],
    footerLink: { label: 'Referenz in RefStack öffnen:', url: detailUrl },
  })

  try {
    await resend.emails.send({
      from: getRefstackResendFrom(),
      to,
      subject: `Interne Referenzfreigabe: ${params.accountCompanyName} – ${params.referenceTitle}`,
      html,
    })
    return true
  } catch (e) {
    log.error('send failed', { action: 'sendInternalApprovalReviewEmail' }, e)
    return false
  }
}

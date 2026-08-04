import 'server-only'

import { Resend } from 'resend'

import {
  buildRefstackEmailHtml,
  buildReferenceMetaRows,
  escapeRefstackEmailHtml,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import { getAppOrigin } from '@/lib/env/app-origin'
import { resolveCustomerApprovalIntro } from '@/lib/references/approval-workflow-display'
import { log } from '@/lib/observability/logger'

function buildRequestLinePlain(args: {
  customerFacingName?: string | null
  coordinatorName?: string | null
  vendorOrgName: string
}): string {
  const intro = resolveCustomerApprovalIntro({
    customerFacingName: args.customerFacingName,
    coordinatorName: args.coordinatorName,
    orgName: args.vendorOrgName,
  })

  if (intro.mode === 'person' && intro.personName) {
    return `<strong>${escapeRefstackEmailHtml(intro.personName)}</strong> von <strong>${escapeRefstackEmailHtml(intro.orgName)}</strong> bittet um die Freigabe Ihres gemeinsamen Projekts als Referenz.`
  }

  return `<strong>${escapeRefstackEmailHtml(intro.orgName)}</strong> bittet um die Freigabe Ihres gemeinsamen Projekts als Referenz.`
}

export async function sendClientApprovalDelegationEmail(args: {
  to: string
  delegateFirstName?: string | null
  previousContactName: string
  companyName: string
  referenceTitle: string
  approvalToken: string
  customerFacingName?: string | null
  coordinatorName?: string | null
  vendorOrgName: string
}): Promise<boolean> {
  const email = args.to.trim()
  if (!email.includes('@')) return false

  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return false

  const firstName = String(args.delegateFirstName ?? '').trim()
  const previousContact =
    String(args.previousContactName ?? '').trim() || 'Ihrem bisherigen Ansprechpartner'
  const companyName = String(args.companyName ?? '').trim() || 'Ihr Unternehmen'
  const refTitle = String(args.referenceTitle ?? '').trim() || 'Referenz'
  const approvalUrl = `${getAppOrigin()}/approval/${args.approvalToken.trim()}`
  const greeting = firstName ? `Hallo ${firstName}!` : 'Hallo!'
  const requestLine = buildRequestLinePlain({
    customerFacingName: args.customerFacingName,
    coordinatorName: args.coordinatorName,
    vendorOrgName: args.vendorOrgName,
  })

  const html = buildRefstackEmailHtml({
    audience: 'external',
    badge: 'Delegierte Freigabe',
    greeting,
    bodyHtml: `<p style="margin:0 0 16px;">Sie wurden von <strong>${escapeRefstackEmailHtml(previousContact)}</strong> als zuständiger Ansprechpartner für eine Referenz-Freigabe benannt.</p>
      <p style="margin:0 0 16px;">${requestLine}</p>
      <p style="margin:0;">Vielen Dank für Ihre Unterstützung!</p>`,
    meta: { rows: buildReferenceMetaRows(refTitle, companyName) },
    ctas: [{ label: 'Zur Freigabe', href: approvalUrl }],
  })

  try {
    const resend = new Resend(key)
    await resend.emails.send({
      from: getRefstackResendFrom(),
      to: email,
      subject: `Delegierte Freigabe: ${companyName} – ${refTitle}`,
      html,
    })
    return true
  } catch (e) {
    log.error('send failed', { action: 'sendClientApprovalDelegationEmail' }, e)
    return false
  }
}

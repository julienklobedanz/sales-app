import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildRefstackEmailHtml,
  buildReferenceMetaRows,
  escapeRefstackEmailHtml,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import {
  fetchVendorOrganizationName,
  resolveCustomerApprovalRecipient,
  type CustomerApprovalRecipientRow,
} from '@/lib/references/customer-approval-recipient'
import { log } from '@/lib/observability/logger'

export function buildCustomerControlLoopEmailHtml(args: {
  firstName: string
  vendorOrgName: string
  companyName: string
  refTitle: string
  manageUrl: string
  /** Neuer Sperrlink nach Rotation (sonst Erstfreigabe). */
  isNewLink?: boolean
}): string {
  const greeting = args.firstName.trim() ? `Hallo ${args.firstName.trim()}!` : 'Hallo!'
  const vendor = escapeRefstackEmailHtml(args.vendorOrgName.trim() || 'Refstack')
  const intro = args.isNewLink
    ? `<p style="margin:0 0 16px;">Wir haben einen neuen persönlichen Kontroll-Link für Ihre Referenz-Freigabe erzeugt. Der bisherige Link ist nicht mehr gültig.</p>`
    : `<p style="margin:0 0 16px;">Vielen Dank für die Freigabe der Referenz für <strong>${vendor}</strong>.</p>`

  const control = `<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#334155;">Du behältst jederzeit die volle Kontrolle: Über den folgenden individuellen Link kannst du deine Freigabe jederzeit bearbeiten, den Status deiner Freigabe einsehen, das Anonymisierungs-Level ändern oder den Zugang für das Team von <strong>${vendor}</strong> mit einem Klick komplett und dauerhaft sperren.</p>`

  return buildRefstackEmailHtml({
    audience: 'external',
    badge: args.isNewLink ? 'Neuer Kontroll-Link' : 'Freigabe bestätigt',
    greeting,
    bodyHtml: `${intro}${control}`,
    meta: {
      rows: buildReferenceMetaRows(args.refTitle, args.companyName),
    },
    ctas: [{ label: 'Zur freigegebenen Referenz', href: args.manageUrl }],
  })
}

export async function sendCustomerSperrlinkEmail(args: {
  admin: SupabaseClient
  organizationId: string | null | undefined
  refTitle: string
  companyName: string
  manageUrl: string
  recipient: CustomerApprovalRecipientRow
  isNewLink?: boolean
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return false

  const recipient = await resolveCustomerApprovalRecipient(args.admin, args.recipient)
  if (!recipient) return false

  const vendorOrgName = await fetchVendorOrganizationName(args.admin, args.organizationId)
  const subject = args.isNewLink
    ? `Ihr neuer Kontroll-Link – ${args.companyName}`
    : `Bestätigung Ihrer Referenz-Freigabe – ${args.companyName}`

  try {
    const resend = new Resend(key)
    await resend.emails.send({
      from: getRefstackResendFrom(),
      to: recipient.email,
      subject,
      html: buildCustomerControlLoopEmailHtml({
        firstName: recipient.firstName,
        vendorOrgName,
        companyName: args.companyName,
        refTitle: args.refTitle,
        manageUrl: args.manageUrl,
        isNewLink: args.isNewLink,
      }),
    })
    return true
  } catch (e) {
    log.error('send failed', { action: 'sendCustomerSperrlinkEmail.send' }, e)
    return false
  }
}

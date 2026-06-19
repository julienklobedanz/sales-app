import {
  buildPortfolioSupplementalHtml,
  buildRefstackEmailHtml,
  buildReferenceMetaRows,
} from '@/lib/email/refstack-email-layout'

export function buildFollowUpApprovalAfterChangesEmailHtml(args: {
  firstName: string
  companyName: string
  refTitle: string
  approvalUrl: string
}): string {
  const greeting = args.firstName.trim() ? `Hallo ${args.firstName.trim()}!` : 'Hallo!'

  return buildRefstackEmailHtml({
    audience: 'external',
    badge: 'Aktualisierte Referenz',
    greeting,
    bodyHtml: `<p style="margin:0 0 16px;">Die Referenz wurde gemäß Ihrer Änderungswünsche angepasst. Bitte prüfen Sie die Referenz noch einmal final und freigeben — vielen Dank!</p>`,
    meta: { rows: buildReferenceMetaRows(args.refTitle, args.companyName) },
    ctas: [{ label: 'Zur Freigabe-Seite', href: args.approvalUrl }],
  })
}

export function buildClientApprovalEmailHtml(args: {
  firstName: string
  requesterBlock: string
  companyName: string
  refTitle: string
  approvalUrl: string
  portfolio: { manageUrl: string; publicPreviewUrl: string } | null
}): string {
  const greeting = args.firstName.trim() ? `Hallo ${args.firstName.trim()}!` : 'Hallo!'

  return buildRefstackEmailHtml({
    audience: 'external',
    badge: 'Freigabe-Anfrage',
    greeting,
    bodyHtml: `${args.requesterBlock}
      <p style="margin:0 0 16px;">Bitte öffnen Sie den Link, um die Referenz zu prüfen und zu entscheiden:</p>`,
    meta: { rows: buildReferenceMetaRows(args.refTitle, args.companyName) },
    ctas: [{ label: 'Zur Freigabe-Seite', href: args.approvalUrl }],
    supplementalHtml: args.portfolio ? buildPortfolioSupplementalHtml(args.portfolio) : undefined,
  })
}

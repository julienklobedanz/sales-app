export type RefstackEmailAudience = 'internal' | 'external'

export type RefstackEmailMetaRow = {
  label: string
  value: string
}

export type RefstackEmailCta = {
  label: string
  href: string
  variant?: 'primary' | 'warning'
}

export type RefstackEmailLayoutInput = {
  audience: RefstackEmailAudience
  badge?: string
  /** z. B. "Hallo," oder "Hallo Max!" */
  greeting?: string
  bodyHtml: string
  meta?: {
    rows: RefstackEmailMetaRow[]
    extraHtml?: string
  }
  ctas?: RefstackEmailCta[]
  supplementalHtml?: string
  footerLink?: { label: string; url: string }
}

export function escapeRefstackEmailHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function getRefstackResendFrom(): string {
  return process.env.RESEND_FROM?.trim() || 'Refstack <onboarding@resend.dev>'
}

export function buildReferenceMetaRows(
  referenceTitle: string,
  accountOrCompanyName: string,
): RefstackEmailMetaRow[] {
  return [
    { label: 'Referenz', value: referenceTitle },
    { label: 'Account', value: accountOrCompanyName },
  ]
}

function audienceHeaderLabel(audience: RefstackEmailAudience): string {
  return audience === 'internal' ? 'Interne Benachrichtigung' : 'Referenz-Freigabe'
}

function audienceFooterNote(audience: RefstackEmailAudience): string {
  return audience === 'internal'
    ? 'RefStack · Automatische Benachrichtigung'
    : 'RefStack · Diese E-Mail betrifft eine Referenz-Freigabe.'
}

function renderBadge(badge: string): string {
  const text = escapeRefstackEmailHtml(badge)
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
  <tr>
    <td style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;color:#334155;line-height:1.4;">
      ${text}
    </td>
  </tr>
</table>`
}

function renderMetaBox(meta: NonNullable<RefstackEmailLayoutInput['meta']>): string {
  const rows = meta.rows
    .map((row) => {
      const label = escapeRefstackEmailHtml(row.label)
      const value = escapeRefstackEmailHtml(row.value)
      return `<tr>
        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#64748b;width:88px;vertical-align:top;">${label}</td>
        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#0f172a;font-weight:600;vertical-align:top;">${value}</td>
      </tr>`
    })
    .join('')

  const extra = meta.extraHtml?.trim() ? meta.extraHtml : ''

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
  <tr>
    <td style="padding:16px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      ${extra}
    </td>
  </tr>
</table>`
}

function renderCtas(ctas: RefstackEmailCta[]): string {
  return ctas
    .map((cta) => {
      const href = escapeRefstackEmailHtml(cta.href)
      const label = escapeRefstackEmailHtml(cta.label)
      const bg = cta.variant === 'warning' ? '#b45309' : '#0f172a'
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;">
  <tr>
    <td style="border-radius:6px;background:${bg};">
      <a href="${href}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;line-height:1.4;">${label}</a>
    </td>
  </tr>
</table>`
    })
    .join('')
}

/** Table-basiertes RefStack-E-Mail-Layout (intern + extern). */
export function buildRefstackEmailHtml(input: RefstackEmailLayoutInput): string {
  const greeting = escapeRefstackEmailHtml(input.greeting?.trim() || 'Hallo,')
  const headerRight = escapeRefstackEmailHtml(audienceHeaderLabel(input.audience))
  const footerNote = escapeRefstackEmailHtml(audienceFooterNote(input.audience))

  const badgeBlock = input.badge?.trim() ? renderBadge(input.badge.trim()) : ''
  const metaBlock = input.meta?.rows?.length ? renderMetaBox(input.meta) : ''
  const ctaBlock = input.ctas?.length ? renderCtas(input.ctas) : ''
  const supplemental = input.supplementalHtml?.trim() ?? ''
  const footerLink = input.footerLink
    ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#64748b;">${escapeRefstackEmailHtml(input.footerLink.label)}<br/>
      <a href="${escapeRefstackEmailHtml(input.footerLink.url)}" style="color:#2563eb;word-break:break-all;">${escapeRefstackEmailHtml(input.footerLink.url)}</a></p>`
    : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RefStack</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
          <tr>
            <td style="padding:24px 28px 16px;border-bottom:1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">RefStack</td>
                  <td align="right" style="font-size:12px;color:#64748b;line-height:1.4;">${headerRight}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 28px;font-size:15px;line-height:1.6;color:#334155;">
              ${badgeBlock}
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#0f172a;">${greeting}</p>
              ${input.bodyHtml}
              ${metaBlock}
              ${ctaBlock}
              ${supplemental}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.5;color:#64748b;">
              <p style="margin:0;">${footerNote}</p>
              ${footerLink}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildPortfolioSupplementalHtml(portfolio: {
  manageUrl: string
  publicPreviewUrl: string
  heading?: string
  manageButtonLabel?: string
}): string {
  const heading = escapeRefstackEmailHtml(
    portfolio.heading ?? 'Kundenansicht & Zugriff beenden',
  )
  const manageLabel = escapeRefstackEmailHtml(
    portfolio.manageButtonLabel ?? 'Persönlicher Link (mit Sperrrecht)',
  )
  const previewUrl = escapeRefstackEmailHtml(portfolio.publicPreviewUrl)

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-top:1px solid #e2e8f0;">
  <tr>
    <td style="padding-top:24px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0f172a;">${heading}</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#334155;">Mit dem <strong>ersten Link</strong> prüfen und freigeben Sie die Referenz. Der <strong>zweite Link</strong> zeigt dieselbe Kundenansicht – er ist nur für Sie bestimmt: Dort können Sie den öffentlichen Zugriff bei Bedarf <strong>sofort sperren</strong>. Bitte den zweiten Link nicht an Dritte weiterleiten.</p>
      ${renderCtas([{ label: manageLabel, href: portfolio.manageUrl, variant: 'warning' }])}
      <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Öffentliche Kundenansicht ohne Sperrrecht (zum Weitergeben im Unternehmen):<br/>
        <a href="${previewUrl}" style="color:#2563eb;word-break:break-all;">${previewUrl}</a></p>
    </td>
  </tr>
</table>`
}

export function buildConfirmationPortfolioSupplementalHtml(portfolio: {
  manageUrl: string
  publicPreviewUrl: string
}): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-top:1px solid #e2e8f0;">
  <tr>
    <td style="padding-top:24px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0f172a;">Ihre persönlichen Links</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#334155;">Mit dem <strong>ersten Link</strong> können Sie Ihre Freigabe und Anmerkungen jederzeit anpassen. Der <strong>zweite Link</strong> zeigt die Kundenansicht und ermöglicht Ihnen, den öffentlichen Zugriff bei Bedarf <strong>sofort zu sperren</strong>. Bitte den zweiten Link nicht an Dritte weiterleiten.</p>
      ${renderCtas([{ label: 'Persönlicher Sperrlink', href: portfolio.manageUrl, variant: 'warning' }])}
      <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Öffentliche Kundenansicht ohne Sperrrecht:<br/>
        <a href="${escapeRefstackEmailHtml(portfolio.publicPreviewUrl)}" style="color:#2563eb;word-break:break-all;">${escapeRefstackEmailHtml(portfolio.publicPreviewUrl)}</a></p>
    </td>
  </tr>
</table>`
}

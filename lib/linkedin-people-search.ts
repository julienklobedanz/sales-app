/**
 * LinkedIn People-Suche (öffentliche Such-URL, kein API).
 * Nutzt Stichworte: Name + Arbeitgeber-Hinweis (Org-Name oder Domain aus E-Mail).
 */

export function employerHintFromEmail(email: string | null | undefined): string | null {
  const e = String(email ?? '')
    .trim()
    .toLowerCase()
  const at = e.indexOf('@')
  if (at < 0) return null
  const domain = e.slice(at + 1).replace(/^www\./, '')
  if (!domain || domain.endsWith('gmail.com') || domain.endsWith('googlemail.com'))
    return null
  const main = domain.split('.')[0] ?? ''
  if (!main || main.length < 2) return null
  return main.replace(/-/g, ' ')
}

export function buildInternalContactLinkedInHref(args: {
  firstName: string | null | undefined
  lastName: string | null | undefined
  linkedinUrl: string | null | undefined
  organizationName: string | null | undefined
  email: string | null | undefined
}): string | null {
  const direct = String(args.linkedinUrl ?? '').trim()
  if (direct) {
    if (/^https?:\/\//i.test(direct)) return direct
    return `https://${direct.replace(/^\/+/, '')}`
  }
  const name = [args.firstName, args.lastName].filter(Boolean).join(' ').trim()
  if (!name) return null
  const fromOrg = String(args.organizationName ?? '').trim()
  const fromMail = employerHintFromEmail(args.email)
  const companyHint = fromOrg || fromMail
  const keywords = companyHint ? `${name} ${companyHint}` : name
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`
}

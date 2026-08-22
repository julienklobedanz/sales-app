/** Reserved slugs that must not be claimed as tenant subdomains. */
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'mail',
  'ftp',
  'staging',
  'status',
  'support',
  'help',
  'auth',
  'login',
  'register',
  'dashboard',
  'refstack',
  'cdn',
  'static',
  'assets',
])

const SUBDOMAIN_FORMAT = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export function slugifySubdomainFromOrgName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
}

export function normalizeSubdomainInput(value: string): string {
  return value.trim().toLowerCase()
}

export function validateSubdomainFormat(value: string): string | null {
  const normalized = normalizeSubdomainInput(value)
  if (!normalized) return null
  if (RESERVED_SUBDOMAINS.has(normalized)) {
    return 'Diese Subdomain ist reserviert.'
  }
  if (!SUBDOMAIN_FORMAT.test(normalized)) {
    return 'Subdomain-Format ungültig (nur a–z, 0–9 und Bindestriche).'
  }
  return null
}

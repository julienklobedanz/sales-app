/**
 * Zentrale App-Routen – Navigation, Redirects, revalidatePath, Middleware-Vergleiche.
 * Pfade nur hier ändern, dann Client, Server Actions und Config konsistent halten.
 */
export const ROUTES = {
  home: '/dashboard',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  /** Neues Passwort nach Link aus der Reset-E-Mail (Session nach /auth/callback) */
  authUpdatePassword: '/auth/update-password',
  onboarding: '/onboarding',
  authCallback: '/auth/callback',
  /** Prefix für OAuth/Magic-Link (Middleware: öffentliche Routen) */
  auth: '/auth',
  /** Öffentliche Referenz-Landingpage */
  publicReference: (slug: string) => `/p/${slug}`,
  /** Genehmigungslink aus E-Mails */
  approval: (token: string) => `/approval/${token}`,
  /** Prefix für Middleware (öffentliche Routen) */
  approvalPrefix: '/approval',
  accounts: '/dashboard/accounts',
  accountsDetail: (id: string) => `/dashboard/accounts/${id}`,
  accountsCreate: '/dashboard/accounts?create=1',
  deals: {
    root: '/dashboard/deals',
    new: '/dashboard/deals/new',
    requestNew: '/dashboard/deals/request/new',
    detail: (id: string) => `/dashboard/deals/${id}`,
  },
  evidence: {
    root: '/dashboard/evidence',
    new: '/dashboard/evidence/new',
    newBulk: '/dashboard/evidence/new?bulk=true',
    detail: (id: string) => `/dashboard/evidence/${id}`,
    edit: (id: string) => `/dashboard/evidence/${id}/edit`,
  },
  marketSignals: '/dashboard/market-signals',
  match: '/dashboard/match',
  settings: '/dashboard/settings',
  request: '/dashboard/request',
} as const

/**
 * Pfade für `revalidatePath(..., 'page')` mit dynamischen Segmenten (Next.js App Router).
 */
export const REVALIDATE = {
  evidenceEditPage: '/dashboard/evidence/[id]/edit',
} as const

/** Permanente Weiterleitungen (alte URLs → aktuelle Struktur), siehe `next.config`. */
export const LEGACY_REDIRECTS = [
  { source: '/dashboard/companies', destination: ROUTES.accounts, permanent: true },
  { source: '/dashboard/companies/:path*', destination: '/dashboard/accounts/:path*', permanent: true },
  { source: '/dashboard/new', destination: ROUTES.evidence.new, permanent: true },
  { source: '/dashboard/edit/:id', destination: '/dashboard/evidence/:id/edit', permanent: true },
] as const

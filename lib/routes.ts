/**
 * Zentrale App-Routen – Navigation, Redirects, revalidatePath, Middleware-Vergleiche.
 * Pfade nur hier ändern, dann Client, Server Actions und Config konsistent halten.
 */
export const ROUTES = {
  home: '/dashboard',
  /** Dashboard mit erzwungener Erste-Schritte-Checkliste (nach Onboarding-Wizard). */
  homeWelcome: '/dashboard?welcome=1',
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
  /** Interne AM-Freigabe aus E-Mail */
  internalApproval: (token: string) => `/internal-approval/${token}`,
  internalApprovalPrefix: '/internal-approval',
  accounts: '/dashboard/accounts',
  accountsDetail: (id: string) => `/dashboard/accounts/${id}`,
  accountsCreate: '/dashboard/accounts?create=1',
  deals: {
    root: '/dashboard/deals',
    new: '/dashboard/deals/new',
    requestNew: '/dashboard/deals/request/new',
    detail: (id: string) => `/dashboard/deals/${id}`,
    detailTab: (id: string, tab: 'overview' | 'desk' = 'overview') =>
      tab === 'overview' ? `/dashboard/deals/${id}` : `/dashboard/deals/${id}?tab=${tab}`,
  },
  evidence: {
    root: '/dashboard/evidence',
    new: '/dashboard/evidence/new',
    newBulk: '/dashboard/evidence/new?bulk=true',
    detail: (id: string) => `/dashboard/evidence/${id}`,
    edit: (id: string) => `/dashboard/evidence/${id}/edit`,
  },
  marketSignals: '/dashboard/market-signals',
  /** Watchlist & Stakeholder-Überwachung (ehem. /dashboard/market-signals/manage). */
  marketSignalsManage: '/dashboard/settings/market-signals',
  insights: '/dashboard/insights',
  dealDesk: '/dashboard/deal-desk',
  dealDeskProject: (projectId: string) =>
    `/dashboard/deal-desk?project=${encodeURIComponent(projectId)}`,
  match: '/dashboard/match',
  /** Semantische Suche mit Deal-Kontext (`matchReferences`). */
  matchWithDeal: (dealId: string) =>
    `/dashboard/match?deal=${encodeURIComponent(dealId)}`,
  settings: '/dashboard/settings',
  /** Referenzanfrage (Deal-Kontext); Legacy `/dashboard/request` leitet hierher. */
  request: '/dashboard/deals/request/new',
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
  // Alte Concept-URL (W3); Lesezeichen weiter auf Evidence leiten
  { source: '/dashboard/concepts/inbox-references', destination: ROUTES.evidence.root, permanent: true },
  { source: '/dashboard/request', destination: ROUTES.request, permanent: true },
  // Ehemalige Marktsignale-manage-URL (W4c) → Settings
  { source: '/dashboard/market-signals/manage', destination: ROUTES.marketSignalsManage, permanent: true },
  { source: '/dashboard/market-signals/:path*', destination: ROUTES.accounts, permanent: false },
  { source: '/dashboard/market-signals', destination: ROUTES.accounts, permanent: false },
] as const

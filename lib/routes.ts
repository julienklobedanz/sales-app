/**
 * Zentrale App-Routen – Navigation, Redirects, revalidatePath, Middleware-Vergleiche.
 * Pfade nur hier ändern, dann Client, Server Actions und Config konsistent halten.
 */
export const ROUTES = {
  home: '/',
  /** Startseite mit erzwungener Erste-Schritte-Checkliste (nach Onboarding-Wizard). */
  homeWelcome: '/?welcome=1',
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
  accounts: '/accounts',
  accountsDetail: (id: string) => `/accounts/${id}`,
  accountsCreate: '/accounts?create=1',
  deals: {
    root: '/deals',
    new: '/deals/new',
    requestNew: '/deals/request/new',
    detail: (id: string) => `/deals/${id}`,
    /** Arbeitsbereich Ausschreibung (Unterroute, kein Hash). */
    workspace: (id: string) => `/deals/${id}/ausschreibung`,
    /** Alias von `workspace` — ersetzt Legacy-Tab „KI-Analyse" / `?tab=desk` / `#ausschreibung`. */
    detailRfp: (id: string) => `/deals/${id}/ausschreibung`,
    detailTab: (id: string, tab: 'overview' | 'desk' = 'overview') =>
      tab === 'desk' ? `/deals/${id}/ausschreibung` : `/deals/${id}`,
  },
  references: {
    root: '/references',
    new: '/references/new',
    newBulk: '/references/new?bulk=true',
    detail: (id: string) => `/references/${id}`,
    edit: (id: string) => `/references/${id}/edit`,
  },
  marketSignals: '/market-signals',
  /** Watchlist & Stakeholder-Überwachung (ehem. /dashboard/market-signals/manage). */
  marketSignalsManage: '/settings/market-signals',
  settings: '/settings',
  /** Referenzanfrage (Deal-Kontext); Legacy `/dashboard/request` leitet hierher. */
  request: '/deals/request/new',
} as const

/**
 * Pfade für `revalidatePath(..., 'page')` mit dynamischen Segmenten (Next.js App Router).
 */
export const REVALIDATE = {
  referenceEditPage: '/references/[id]/edit',
  /** Auth-Hülle `app/(app)/layout.tsx`. Nicht ROUTES.home — `/` + layout träfe die ganze App. */
  appShellLayout: '/(app)',
} as const

/** Permanente Weiterleitungen (alte URLs → aktuelle Struktur), siehe `next.config`. */
export const LEGACY_REDIRECTS = [
  {
    source: '/dashboard/evidence',
    destination: '/references',
    permanent: false,
  },
  {
    source: '/dashboard/evidence/:path*',
    destination: '/references/:path*',
    permanent: false,
  },
  { source: '/dashboard/companies', destination: ROUTES.accounts, permanent: true },
  {
    source: '/dashboard/companies/:path*',
    destination: '/accounts/:path*',
    permanent: true,
  },
  { source: '/dashboard/new', destination: ROUTES.references.new, permanent: true },
  {
    source: '/dashboard/edit/:id',
    destination: '/references/:id/edit',
    permanent: true,
  },
  // Alte Concept-URL (W3); Lesezeichen weiter auf Referenzen leiten
  {
    source: '/dashboard/concepts/inbox-references',
    destination: ROUTES.references.root,
    permanent: true,
  },
  { source: '/dashboard/request', destination: ROUTES.request, permanent: true },
  // Ehemalige Marktsignale-manage-URL (W4c) → Settings
  {
    source: '/dashboard/market-signals/manage',
    destination: ROUTES.marketSignalsManage,
    permanent: true,
  },
  // P3-3: alte KI-Entwurf-API → ai-draft
  {
    source: '/api/ki-entwurf/stream',
    destination: '/api/ai-draft/stream',
    permanent: false,
  },
  { source: '/dashboard', destination: ROUTES.home, permanent: true },
  { source: '/dashboard/:path*', destination: '/:path*', permanent: true },
] as const

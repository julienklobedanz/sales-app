import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'

export type DashboardListPageMeta = {
  title: string
  subtitle?: string
}

function dashboardParts(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

/** Routen mit eigenem Seitentitel im Page-Body (kein zentraler List-Header). */
export function shouldShowDashboardListPageHeader(pathname: string | null): boolean {
  if (!pathname) return false

  if (pathname === ROUTES.home) return false
  if (pathname === ROUTES.marketSignals) return false
  if (pathname === ROUTES.marketSignalsManage) return false

  if (pathname === ROUTES.deals.new || pathname === ROUTES.deals.requestNew) return false
  if (pathname === ROUTES.references.new) return false

  const parts = dashboardParts(pathname)
  if (parts[0] === 'accounts' && parts.length >= 2) return false

  if (parts[0] === 'deals' && parts.length >= 2) return false

  if (parts[0] === 'references' && parts.length >= 2) return false

  if (pathname === ROUTES.accounts) return true
  if (pathname === ROUTES.references.root) return true
  if (pathname === ROUTES.compliance.root) return true
  if (pathname === ROUTES.deals.root) return true
  if (pathname.startsWith(ROUTES.settings)) return true

  return false
}

export function getDashboardListPageMeta(
  pathname: string | null,
): DashboardListPageMeta | null {
  if (!pathname || !shouldShowDashboardListPageHeader(pathname)) return null

  if (pathname === ROUTES.accounts) {
    return { title: COPY.nav.accounts }
  }

  if (pathname === ROUTES.references.root) {
    return { title: COPY.nav.references }
  }

  if (pathname === ROUTES.compliance.root) {
    return { title: COPY.nav.compliance }
  }

  if (pathname === ROUTES.deals.root) {
    return { title: COPY.nav.deals }
  }

  if (pathname === `${ROUTES.settings}/workflow`) {
    return { title: 'Workflow' }
  }

  if (pathname.startsWith(ROUTES.settings)) {
    return { title: 'Einstellungen' }
  }

  return { title: COPY.pages.dashboard }
}

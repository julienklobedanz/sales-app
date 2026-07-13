import { COPY } from '@/lib/copy'
import {
  accountsListTitle,
  type AccountsListView,
} from '@/lib/accounts/accounts-list-view'
import {
  referenceLibraryTitle,
  type ReferenceLibraryMode,
} from '@/lib/references/library/reference-library-mode'
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
  if (pathname.startsWith(ROUTES.match)) return false
  if (pathname === ROUTES.marketSignals) return false
  if (pathname.startsWith(ROUTES.insights)) return false
  if (pathname === ROUTES.marketSignalsManage) return false
  if (pathname.startsWith(ROUTES.dealDesk)) return false

  if (pathname === ROUTES.deals.new || pathname === ROUTES.deals.requestNew) return false
  if (pathname === ROUTES.references.new) return false

  const parts = dashboardParts(pathname)
  if (parts[0] !== 'dashboard') return false

  if (parts[1] === 'accounts' && parts.length >= 3) return false

  if (parts[1] === 'deals' && parts.length >= 3) return false

  if (parts[1] === 'references' && parts.length >= 3) return false

  if (pathname === ROUTES.accounts) return true
  if (pathname === ROUTES.references.root) return true
  if (pathname === ROUTES.deals.root) return true
  if (pathname.startsWith(ROUTES.settings)) return true

  return false
}

export function getDashboardListPageMeta(
  pathname: string | null,
  context: {
    accountsListView: AccountsListView
    referenceLibraryMode: ReferenceLibraryMode
  }
): DashboardListPageMeta | null {
  if (!pathname || !shouldShowDashboardListPageHeader(pathname)) return null

  if (pathname === ROUTES.accounts) {
    return { title: accountsListTitle(context.accountsListView) }
  }

  if (pathname === ROUTES.references.root) {
    return { title: referenceLibraryTitle(context.referenceLibraryMode) }
  }

  if (pathname === ROUTES.deals.root) {
    return { title: 'Deals' }
  }

  if (pathname === `${ROUTES.settings}/workflow`) {
    return { title: 'Workflow' }
  }

  if (pathname.startsWith(ROUTES.settings)) {
    return { title: 'Einstellungen' }
  }

  return { title: COPY.pages.dashboard }
}

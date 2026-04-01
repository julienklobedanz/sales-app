import { ROUTES } from './routes'

/**
 * Einheitlicher Inhaltsbereich unter {@link DashboardShell} (Sidebar + Header).
 * Horizontale/vertikale Außenabstände nur hier bzw. in `dashboard-shell.tsx` anpassen.
 */
export const DASHBOARD_SCROLL_AREA_CLASS =
  'flex min-h-0 w-full flex-1 flex-col gap-6 px-6 pt-6 md:px-12 lg:px-20'

/** Minimaler Flex-Container ohne Shell-Padding (Wizard-Seiten, Firmen-Detail). */
export const DASHBOARD_SCROLL_AREA_BLEED_CLASS =
  'flex min-h-0 w-full flex-1 flex-col'

/**
 * Routen mit eigenem Außenlayout (z. B. `min-h-screen p-4` oder Firmen-Detail-Padding).
 */
export function routeExcludesDashboardContentPadding(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname === ROUTES.deals.new || pathname === ROUTES.evidence.new) return true
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'dashboard' && parts[1] === 'accounts' && parts.length >= 3) {
    return true
  }
  return false
}

/**
 * Zusätzlicher unterer Abstand für typische Detailseiten (lange Scroll-Inhalte).
 */
export function detailRouteNeedsBottomPadding(pathname: string | null): boolean {
  if (!pathname) return false
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'dashboard') return false
  if (parts[1] === 'evidence' && parts.length >= 3 && parts[2] !== 'new') {
    return true
  }
  if (
    parts[1] === 'deals' &&
    parts.length >= 3 &&
    parts[2] !== 'new' &&
    parts[2] !== 'request'
  ) {
    return true
  }
  return false
}

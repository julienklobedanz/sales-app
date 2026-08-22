import { ROUTES } from './routes'

/** Einheitliche Seitentitel im Dashboard (Listen + Home: text-2xl wie Marktsignale). */
export const DASHBOARD_PAGE_TITLE_CLASS =
  'text-2xl font-semibold tracking-tight text-foreground'

/** Einheitlicher Untertitel / Secondary Copy direkt unter Seitentiteln. */
export const DASHBOARD_PAGE_SUBTITLE_CLASS = 'mt-1 text-sm text-muted-foreground'

/**
 * Routen mit eigenem Außenlayout (z. B. `min-h-screen p-4` oder Firmen-Detail-Padding).
 */
export function routeExcludesDashboardContentPadding(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname === ROUTES.deals.new || pathname === ROUTES.references.new) return true
  if (pathname === ROUTES.match) return true
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'dashboard' && parts[1] === 'accounts' && parts.length >= 3) {
    return true
  }
  if (
    parts[0] === 'dashboard' &&
    parts[1] === 'deals' &&
    parts[3] === 'ausschreibung'
  ) {
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
  if (parts[1] === 'references' && parts[3] === 'edit') {
    return true
  }
  if (parts[1] === 'deals' && parts[3] === 'ausschreibung') {
    return false
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

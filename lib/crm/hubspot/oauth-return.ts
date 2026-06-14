import { ROUTES } from '@/lib/routes'

export type HubSpotOAuthReturnTo = 'accounts' | 'deals' | 'settings' | 'onboarding'

export const HUBSPOT_OAUTH_RETURN_COOKIE = 'hubspot_oauth_return_to'

export function parseHubSpotOAuthReturnTo(
  value: string | null | undefined
): HubSpotOAuthReturnTo {
  if (value === 'deals' || value === 'settings' || value === 'onboarding') return value
  return 'accounts'
}

export function getHubSpotConnectHref(returnTo: HubSpotOAuthReturnTo = 'accounts'): string {
  return `/api/integrations/hubspot/connect?returnTo=${returnTo}`
}

/** Relative callback path including CRM query params (no origin). */
export function buildHubSpotOAuthCallbackPath(
  returnTo: HubSpotOAuthReturnTo,
  status: 'success' | 'error',
  options?: { openImport?: boolean }
): string {
  const params = new URLSearchParams()
  params.set('crm_connected', status)
  params.set('crm_provider', 'hubspot')

  const openImport =
    options?.openImport !== false && returnTo !== 'onboarding' && status === 'success'
  if (openImport) {
    params.set('crm_import', '1')
  }

  if (returnTo === 'settings') {
    params.set('tab', 'integrations')
    return `${ROUTES.settings}?${params.toString()}`
  }

  if (returnTo === 'onboarding') {
    return `${ROUTES.onboarding}?${params.toString()}`
  }

  const path = returnTo === 'deals' ? ROUTES.deals.root : ROUTES.accounts
  return `${path}?${params.toString()}`
}

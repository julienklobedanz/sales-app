import { getAppOrigin } from '@/lib/env/app-origin'

export const HUBSPOT_OAUTH_AUTHORIZE_URL = 'https://app.hubspot.com/oauth/authorize'
export const HUBSPOT_OAUTH_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token'

/** Lesen von Companies + Deals für Discovery-Import. */
export const HUBSPOT_OAUTH_SCOPES = [
  'crm.objects.companies.read',
  'crm.objects.deals.read',
  'oauth',
].join(' ')

export function getHubSpotClientId(): string | null {
  return process.env.HUBSPOT_CLIENT_ID?.trim() || null
}

export function getHubSpotClientSecret(): string | null {
  return process.env.HUBSPOT_CLIENT_SECRET?.trim() || null
}

export function getHubSpotRedirectUri(): string {
  return `${getAppOrigin()}/api/integrations/hubspot/callback`
}

export function isHubSpotConfigured(): boolean {
  return Boolean(getHubSpotClientId() && getHubSpotClientSecret())
}

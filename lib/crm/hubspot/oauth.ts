import { randomBytes } from 'crypto'

import {
  getHubSpotClientId,
  getHubSpotClientSecret,
  getHubSpotRedirectUri,
  HUBSPOT_OAUTH_AUTHORIZE_URL,
  HUBSPOT_OAUTH_SCOPES,
  HUBSPOT_OAUTH_TOKEN_URL,
} from '@/lib/crm/hubspot/config'

export const HUBSPOT_OAUTH_STATE_COOKIE = 'hubspot_oauth_state'

export function createHubSpotOAuthState(): string {
  return randomBytes(24).toString('hex')
}

export function buildHubSpotAuthorizeUrl(state: string): string | null {
  const clientId = getHubSpotClientId()
  if (!clientId) return null

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getHubSpotRedirectUri(),
    scope: HUBSPOT_OAUTH_SCOPES,
    state,
  })

  return `${HUBSPOT_OAUTH_AUTHORIZE_URL}?${params.toString()}`
}

type HubSpotTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  hub_id?: number
  hub_domain?: string
  message?: string
  status?: string
}

export type HubSpotTokenExchangeResult =
  | {
      success: true
      accessToken: string
      refreshToken: string | null
      expiresAt: string | null
      hubId: string | null
    }
  | { success: false; error: string }

export async function exchangeHubSpotAuthorizationCode(
  code: string
): Promise<HubSpotTokenExchangeResult> {
  const clientId = getHubSpotClientId()
  const clientSecret = getHubSpotClientSecret()
  if (!clientId || !clientSecret) {
    return { success: false, error: 'HubSpot ist nicht konfiguriert.' }
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getHubSpotRedirectUri(),
    code,
  })

  const res = await fetch(HUBSPOT_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const json = (await res.json().catch(() => ({}))) as HubSpotTokenResponse
  if (!res.ok || !json.access_token) {
    return {
      success: false,
      error: json.message ?? 'HubSpot-Token-Austausch fehlgeschlagen.',
    }
  }

  const expiresAt =
    typeof json.expires_in === 'number'
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : null

  return {
    success: true,
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt,
    hubId: json.hub_id != null ? String(json.hub_id) : null,
  }
}

export async function refreshHubSpotAccessToken(
  refreshToken: string
): Promise<HubSpotTokenExchangeResult> {
  const clientId = getHubSpotClientId()
  const clientSecret = getHubSpotClientSecret()
  if (!clientId || !clientSecret) {
    return { success: false, error: 'HubSpot ist nicht konfiguriert.' }
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })

  const res = await fetch(HUBSPOT_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const json = (await res.json().catch(() => ({}))) as HubSpotTokenResponse
  if (!res.ok || !json.access_token) {
    return {
      success: false,
      error: json.message ?? 'HubSpot-Token-Erneuerung fehlgeschlagen.',
    }
  }

  const expiresAt =
    typeof json.expires_in === 'number'
      ? new Date(Date.now() + json.expires_in * 1000).toISOString()
      : null

  return {
    success: true,
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt,
    hubId: json.hub_id != null ? String(json.hub_id) : null,
  }
}

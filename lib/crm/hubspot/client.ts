import type { SupabaseClient } from '@supabase/supabase-js'

import {
  getOrganizationCrmConnection,
  updateOrganizationCrmTokens,
} from '@/lib/crm/connections'
import { refreshHubSpotAccessToken } from '@/lib/crm/hubspot/oauth'
import type { OrganizationCrmConnectionRow } from '@/lib/crm/types'

const TOKEN_REFRESH_BUFFER_MS = 60_000

export type HubSpotApiError = {
  status: string
  message: string
  correlationId?: string
}

async function ensureFreshHubSpotAccessToken(
  supabase: SupabaseClient,
  connection: OrganizationCrmConnectionRow,
): Promise<{ accessToken: string; connection: OrganizationCrmConnectionRow } | null> {
  const expiresAt = connection.expires_at
    ? new Date(connection.expires_at).getTime()
    : null
  const needsRefresh =
    expiresAt != null && expiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MS

  if (!needsRefresh) {
    return { accessToken: connection.access_token_enc, connection }
  }

  const refreshToken = connection.refresh_token_enc
  if (!refreshToken) {
    return null
  }

  const refreshed = await refreshHubSpotAccessToken(refreshToken)
  if (!refreshed.success) {
    return null
  }

  await updateOrganizationCrmTokens(supabase, connection.organization_id, 'hubspot', {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt,
  })

  return {
    accessToken: refreshed.accessToken,
    connection: {
      ...connection,
      access_token_enc: refreshed.accessToken,
      refresh_token_enc: refreshed.refreshToken,
      expires_at: refreshed.expiresAt,
      external_account_id: refreshed.hubId ?? connection.external_account_id,
    },
  }
}

export async function getHubSpotAccessTokenForOrg(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string | null> {
  const connection = await getOrganizationCrmConnection(
    supabase,
    organizationId,
    'hubspot',
  )
  if (!connection?.access_token_enc) return null

  const fresh = await ensureFreshHubSpotAccessToken(supabase, connection)
  return fresh?.accessToken ?? null
}

export async function hubSpotApiFetch<T>(
  supabase: SupabaseClient,
  organizationId: string,
  path: string,
  init?: RequestInit,
): Promise<{ success: true; data: T } | { success: false; error: string; status: number }> {
  const accessToken = await getHubSpotAccessTokenForOrg(supabase, organizationId)
  if (!accessToken) {
    return { success: false, error: 'HubSpot ist nicht verbunden.', status: 401 }
  }

  const res = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as HubSpotApiError
    return {
      success: false,
      error: err.message ?? `HubSpot API Fehler (${res.status})`,
      status: res.status,
    }
  }

  const data = (await res.json()) as T
  return { success: true, data }
}

export function buildHubSpotDealUrl(params: {
  portalId: string | null | undefined
  dealId: string
}): string | null {
  const portalId = String(params.portalId ?? '').trim()
  const dealId = String(params.dealId ?? '').trim()
  if (!portalId || !dealId) return null
  return `https://app.hubspot.com/contacts/${encodeURIComponent(portalId)}/deal/${encodeURIComponent(dealId)}`
}

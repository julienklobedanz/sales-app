import type { SupabaseClient } from '@supabase/supabase-js'

import type { CrmProvider, OrganizationCrmConnectionRow } from '@/lib/crm/types'

export async function getOrganizationCrmConnection(
  userSupabase: SupabaseClient,
  organizationId: string,
  provider: CrmProvider
): Promise<OrganizationCrmConnectionRow | null> {
  const { data } = await userSupabase
    .from('organization_crm_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('provider', provider)
    .eq('status', 'connected')
    .maybeSingle()

  return (data as OrganizationCrmConnectionRow | null) ?? null
}

export async function getOrganizationCrmConnectionPublicStatus(
  userSupabase: SupabaseClient,
  organizationId: string,
  provider: CrmProvider
): Promise<{
  connected: boolean
  externalAccountId: string | null
  lastSyncAt: string | null
}> {
  const row = await getOrganizationCrmConnection(userSupabase, organizationId, provider)
  if (!row) {
    return { connected: false, externalAccountId: null, lastSyncAt: null }
  }
  return {
    connected: true,
    externalAccountId: row.external_account_id,
    lastSyncAt: row.last_sync_at,
  }
}

export async function upsertOrganizationCrmConnection(
  userSupabase: SupabaseClient,
  payload: {
    organizationId: string
    provider: CrmProvider
    accessToken: string
    refreshToken: string | null
    expiresAt: string | null
    externalAccountId: string | null
    connectedBy: string
  }
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString()

  const { error } = await userSupabase.from('organization_crm_connections').upsert(
    {
      organization_id: payload.organizationId,
      provider: payload.provider,
      status: 'connected',
      access_token_enc: payload.accessToken,
      refresh_token_enc: payload.refreshToken,
      expires_at: payload.expiresAt,
      external_account_id: payload.externalAccountId,
      connected_by: payload.connectedBy,
      updated_at: now,
    },
    { onConflict: 'organization_id,provider' }
  )

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function disconnectOrganizationCrm(
  userSupabase: SupabaseClient,
  organizationId: string,
  provider: CrmProvider
): Promise<{ success: boolean; error?: string }> {
  const { error } = await userSupabase
    .from('organization_crm_connections')
    .update({
      status: 'disconnected',
      access_token_enc: '',
      refresh_token_enc: null,
      expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)
    .eq('provider', provider)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function touchOrganizationCrmLastSync(
  userSupabase: SupabaseClient,
  organizationId: string,
  provider: CrmProvider
): Promise<void> {
  await userSupabase
    .from('organization_crm_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)
    .eq('provider', provider)
}

export async function updateOrganizationCrmTokens(
  userSupabase: SupabaseClient,
  organizationId: string,
  provider: CrmProvider,
  tokens: {
    accessToken: string
    refreshToken?: string | null
    expiresAt: string | null
  }
): Promise<void> {
  await userSupabase
    .from('organization_crm_connections')
    .update({
      access_token_enc: tokens.accessToken,
      refresh_token_enc: tokens.refreshToken ?? undefined,
      expires_at: tokens.expiresAt,
      status: 'connected',
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', organizationId)
    .eq('provider', provider)
}

/** Portal-ID für Deep-Links — nur ID, keine Tokens (RLS: Org-Admin). */
export async function getHubSpotPortalIdForOrganization(
  userSupabase: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  const { data } = await userSupabase
    .from('organization_crm_connections')
    .select('external_account_id')
    .eq('organization_id', organizationId)
    .eq('provider', 'hubspot')
    .eq('status', 'connected')
    .maybeSingle()

  return data?.external_account_id ?? null
}

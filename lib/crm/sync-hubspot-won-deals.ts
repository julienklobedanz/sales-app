import type { SupabaseClient } from '@supabase/supabase-js'

import { resolveHubSpotContractEndProperty } from '@/lib/accounts/contract-end'
import { hubSpotApiFetch } from '@/lib/crm/hubspot/client'
import {
  formatHubSpotAmount,
  mapHubSpotStageToDealStatus,
} from '@/lib/crm/hubspot/map-deal-stage'
import { getOrganizationCrmConnection } from '@/lib/crm/connections'
import type { CrmProvider } from '@/lib/crm/types'

type HubSpotDealSearchResponse = {
  results?: Array<{
    id: string
    properties?: Record<string, string | null>
  }>
  paging?: { next?: { after?: string } }
}

type HubSpotAssociationBatchResponse = {
  results?: Array<{
    from?: { id: string }
    to?: Array<{ toObjectId: string }>
  }>
}

const BASE_DEAL_PROPERTIES = [
  'dealname',
  'amount',
  'dealstage',
  'closedate',
  'hs_is_closed',
]

function parseHubSpotDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const sliced = raw.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sliced)) return null
  return sliced
}

async function fetchClosedWonDeals(
  supabase: SupabaseClient,
  organizationId: string,
  contractEndProperty: string,
): Promise<HubSpotDealSearchResponse['results']> {
  const properties = [...BASE_DEAL_PROPERTIES]
  if (!properties.includes(contractEndProperty)) {
    properties.push(contractEndProperty)
  }

  const deals: NonNullable<HubSpotDealSearchResponse['results']> = []
  let after: string | undefined

  for (let page = 0; page < 20; page += 1) {
    const body = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'hs_is_closed',
              operator: 'EQ',
              value: 'true',
            },
          ],
        },
      ],
      properties,
      limit: 100,
      ...(after ? { after } : {}),
    }

    const res = await hubSpotApiFetch<HubSpotDealSearchResponse>(
      supabase,
      organizationId,
      '/crm/v3/objects/deals/search',
      { method: 'POST', body: JSON.stringify(body) },
    )

    if (!res.ok) break

    const batch = (res.data.results ?? []).filter((deal) => {
      const stage = deal.properties?.dealstage ?? ''
      return mapHubSpotStageToDealStatus(stage) === 'won'
    })
    deals.push(...batch)
    after = res.data.paging?.next?.after
    if (!after || (res.data.results ?? []).length === 0) break
  }

  return deals
}

/**
 * Upsert gewonnene HubSpot-Opportunities für verknüpfte Accounts.
 * Close-Datum → expiry_date; konfigurierbares Vertragsende-Property → contract_end_date.
 */
export async function syncHubSpotWonDealsForOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  provider: CrmProvider = 'hubspot',
): Promise<{ upserted: number; skipped: number }> {
  if (provider !== 'hubspot') return { upserted: 0, skipped: 0 }

  const connection = await getOrganizationCrmConnection(
    supabase,
    organizationId,
    provider,
  )
  const contractEndProperty = resolveHubSpotContractEndProperty(
    connection?.hubspot_contract_end_property,
  )

  const deals = await fetchClosedWonDeals(supabase, organizationId, contractEndProperty)
  if (!deals?.length) return { upserted: 0, skipped: 0 }

  const dealIds = deals.map((d) => d.id)
  const associations = await hubSpotApiFetch<HubSpotAssociationBatchResponse>(
    supabase,
    organizationId,
    '/crm/v4/associations/deals/companies/batch/read',
    {
      method: 'POST',
      body: JSON.stringify({ inputs: dealIds.map((id) => ({ id })) }),
    },
  )

  if (!associations.ok) return { upserted: 0, skipped: dealIds.length }

  const companyIdByDealId = new Map<string, string>()
  for (const row of associations.data.results ?? []) {
    const dealId = row.from?.id
    const companyId = row.to?.[0]?.toObjectId
    if (dealId && companyId) companyIdByDealId.set(dealId, companyId)
  }

  const { data: linkedCompanies } = await supabase
    .from('companies')
    .select('id, crm_account_id')
    .eq('organization_id', organizationId)
    .eq('crm_provider', provider)
    .not('crm_account_id', 'is', null)

  const companyIdByCrmAccountId = new Map(
    (linkedCompanies ?? [])
      .filter((c) => c.crm_account_id)
      .map((c) => [c.crm_account_id as string, c.id as string]),
  )

  let upserted = 0
  let skipped = 0

  for (const deal of deals) {
    const hubspotCompanyId = companyIdByDealId.get(deal.id)
    if (!hubspotCompanyId) {
      skipped += 1
      continue
    }
    const companyId = companyIdByCrmAccountId.get(hubspotCompanyId)
    if (!companyId) {
      skipped += 1
      continue
    }

    const oppId = deal.id
    const closeDate = parseHubSpotDate(deal.properties?.closedate)
    const contractEndDate = parseHubSpotDate(deal.properties?.[contractEndProperty])
    const payload = {
      organization_id: organizationId,
      company_id: companyId,
      title:
        String(deal.properties?.dealname ?? 'Gewonnener Deal').trim() ||
        'Gewonnener Deal',
      volume: formatHubSpotAmount(
        deal.properties?.amount ? Number(deal.properties.amount) : null,
      ),
      status: 'won' as const,
      expiry_date: closeDate,
      contract_end_date: contractEndDate,
      crm_source: provider,
      crm_opportunity_id: oppId,
      crm_stage: deal.properties?.dealstage?.trim() || null,
      crm_synced_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('deals')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('crm_source', provider)
      .eq('crm_opportunity_id', oppId)
      .maybeSingle()

    if (existing?.id) {
      const updateFull = {
        status: 'won' as const,
        expiry_date: closeDate,
        contract_end_date: contractEndDate,
        crm_stage: payload.crm_stage,
        crm_synced_at: payload.crm_synced_at,
        company_id: companyId,
        title: payload.title,
        volume: payload.volume,
      }
      let { error } = await supabase
        .from('deals')
        .update(updateFull)
        .eq('id', existing.id)
      if (error?.code === 'PGRST204' && error.message?.includes('contract_end_date')) {
        const { contract_end_date, ...withoutContract } = updateFull
        void contract_end_date
        ;({ error } = await supabase
          .from('deals')
          .update(withoutContract)
          .eq('id', existing.id))
      }
      if (error) skipped += 1
      else upserted += 1
      continue
    }

    let { error: insertError } = await supabase.from('deals').insert(payload)
    if (
      insertError?.code === 'PGRST204' &&
      insertError.message?.includes('contract_end_date')
    ) {
      const { contract_end_date, ...withoutContract } = payload
      void contract_end_date
      ;({ error: insertError } = await supabase.from('deals').insert(withoutContract))
    }
    if (insertError?.code === 'PGRST204' && insertError.message?.includes('crm_stage')) {
      const { crm_stage, contract_end_date, ...withoutStage } = payload
      void crm_stage
      void contract_end_date
      ;({ error: insertError } = await supabase.from('deals').insert(withoutStage))
    }
    if (insertError) skipped += 1
    else upserted += 1
  }

  return { upserted, skipped }
}

import type { SupabaseClient } from '@supabase/supabase-js'

import { hubSpotApiFetch } from '@/lib/crm/hubspot/client'
import type { CrmAccountCandidate } from '@/lib/crm/types'

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

type HubSpotCompanyBatchResponse = {
  results?: Array<{
    id: string
    properties?: Record<string, string | null>
  }>
}

const DEAL_PROPERTIES = ['dealname', 'amount', 'dealstage', 'closedate', 'hs_is_closed']
const COMPANY_PROPERTIES = ['name', 'domain', 'website']

function normalizeWebsite(raw: string | null | undefined): string | null {
  const value = String(raw ?? '').trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

async function fetchAllOpenDeals(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<HubSpotDealSearchResponse['results']> {
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
              value: 'false',
            },
          ],
        },
      ],
      properties: DEAL_PROPERTIES,
      limit: 100,
      ...(after ? { after } : {}),
    }

    const res = await hubSpotApiFetch<HubSpotDealSearchResponse>(
      supabase,
      organizationId,
      '/crm/v3/objects/deals/search',
      { method: 'POST', body: JSON.stringify(body) },
    )

    if (!res.success) break

    const batch = res.data.results ?? []
    deals.push(...batch)
    after = res.data.paging?.next?.after
    if (!after || batch.length === 0) break
  }

  return deals
}

async function fetchCompaniesByIds(
  supabase: SupabaseClient,
  organizationId: string,
  companyIds: string[],
): Promise<Map<string, { name: string; website: string | null }>> {
  const map = new Map<string, { name: string; website: string | null }>()
  const chunkSize = 100

  for (let i = 0; i < companyIds.length; i += chunkSize) {
    const chunk = companyIds.slice(i, i + chunkSize)
    const res = await hubSpotApiFetch<HubSpotCompanyBatchResponse>(
      supabase,
      organizationId,
      '/crm/v3/objects/companies/batch/read',
      {
        method: 'POST',
        body: JSON.stringify({
          properties: COMPANY_PROPERTIES,
          inputs: chunk.map((id) => ({ id })),
        }),
      },
    )

    if (!res.success) continue

    for (const row of res.data.results ?? []) {
      const name = String(row.properties?.name ?? '').trim()
      if (!name) continue
      const website = normalizeWebsite(
        row.properties?.website ?? row.properties?.domain ?? null,
      )
      map.set(row.id, { name, website })
    }
  }

  return map
}

/**
 * Lädt HubSpot-Companies, die mindestens eine offene Opportunity haben.
 */
export async function listHubSpotAccountsWithOpenOpportunities(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<
  { success: true; accounts: CrmAccountCandidate[] } | { success: false; error: string }
> {
  const deals = await fetchAllOpenDeals(supabase, organizationId)
  if (!deals?.length) {
    return { success: true, accounts: [] }
  }

  const dealById = new Map(
    deals.map((deal) => [
      deal.id,
      {
        title: String(deal.properties?.dealname ?? 'Unbenannter Deal').trim(),
        amount: deal.properties?.amount ? Number(deal.properties.amount) : null,
        stage: deal.properties?.dealstage ?? null,
        closeDate: deal.properties?.closedate ?? null,
      },
    ]),
  )

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

  if (!associations.success) {
    return { success: false, error: associations.error }
  }

  const companyToDeals = new Map<string, string[]>()
  for (const row of associations.data.results ?? []) {
    const dealId = row.from?.id
    if (!dealId) continue
    for (const target of row.to ?? []) {
      const companyId = target.toObjectId
      if (!companyId) continue
      const list = companyToDeals.get(companyId) ?? []
      list.push(dealId)
      companyToDeals.set(companyId, list)
    }
  }

  const companyIds = [...companyToDeals.keys()]
  if (!companyIds.length) {
    return { success: true, accounts: [] }
  }

  const companies = await fetchCompaniesByIds(supabase, organizationId, companyIds)
  const accounts: CrmAccountCandidate[] = []

  for (const companyId of companyIds) {
    const company = companies.get(companyId)
    if (!company) continue

    const oppIds = companyToDeals.get(companyId) ?? []
    const opportunities = oppIds
      .map((dealId) => {
        const deal = dealById.get(dealId)
        if (!deal) return null
        return {
          externalOpportunityId: dealId,
          title: deal.title,
          amount: Number.isFinite(deal.amount) ? deal.amount : null,
          stage: deal.stage,
          closeDate: deal.closeDate,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x != null)

    if (!opportunities.length) continue

    accounts.push({
      externalAccountId: companyId,
      name: company.name,
      website: company.website,
      opportunities,
    })
  }

  accounts.sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return { success: true, accounts }
}

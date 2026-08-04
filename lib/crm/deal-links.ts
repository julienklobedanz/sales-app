import { buildSalesforceOpportunityUrl } from '@/lib/crm/salesforce'
import { buildHubSpotDealUrl } from '@/lib/crm/hubspot/client'

export function dealHasCrmSync(deal: {
  salesforce_opportunity_id?: string | null
  crm_opportunity_id?: string | null
  crm_source?: string | null
}): boolean {
  return Boolean(
    deal.salesforce_opportunity_id?.trim() ||
    (deal.crm_opportunity_id?.trim() && deal.crm_source?.trim()),
  )
}

export function buildCrmDealUrl(
  deal: {
    salesforce_opportunity_id?: string | null
    crm_opportunity_id?: string | null
    crm_source?: string | null
  },
  options?: { hubspotPortalId?: string | null },
): { label: string; href: string } | null {
  const crmSource = String(deal.crm_source ?? '')
    .trim()
    .toLowerCase()
  const genericOppId = String(deal.crm_opportunity_id ?? '').trim()
  const salesforceOppId = String(deal.salesforce_opportunity_id ?? '').trim()

  if (crmSource === 'hubspot' && genericOppId) {
    const href = buildHubSpotDealUrl({
      portalId: options?.hubspotPortalId,
      dealId: genericOppId,
    })
    if (href) return { label: 'HubSpot', href }
  }

  if (salesforceOppId) {
    const href = buildSalesforceOpportunityUrl({ opportunityId: salesforceOppId })
    if (href) return { label: 'Salesforce', href }
  }

  if (genericOppId && crmSource) {
    return { label: crmSource, href: '#' }
  }

  return null
}

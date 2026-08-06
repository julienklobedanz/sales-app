import type { SupabaseClient } from '@supabase/supabase-js'

import { syncExistingAccountBrandfetch } from '@/lib/accounts/resolve-account-for-import'
import { touchOrganizationCrmLastSync } from '@/lib/crm/connections'
import { syncHubSpotWonDealsForOrganization } from '@/lib/crm/sync-hubspot-won-deals'
import {
  formatHubSpotAmount,
  mapHubSpotStageToDealStatus,
} from '@/lib/crm/hubspot/map-deal-stage'
import { findExistingCompanyForCrmImport } from '@/lib/crm/match-existing-company'
import type {
  CrmAccountCandidate,
  CrmImportPreviewItem,
  CrmImportResult,
  CrmProvider,
} from '@/lib/crm/types'

export async function buildCrmImportPreview(
  supabase: SupabaseClient,
  organizationId: string,
  provider: CrmProvider,
  accounts: CrmAccountCandidate[],
): Promise<CrmImportPreviewItem[]> {
  const preview: CrmImportPreviewItem[] = []

  for (const account of accounts) {
    const existing = await findExistingCompanyForCrmImport(supabase, organizationId, {
      provider,
      externalAccountId: account.externalAccountId,
      name: account.name,
      website: account.website,
    })

    let matchStatus: CrmImportPreviewItem['matchStatus'] = 'new'
    if (existing?.matchReason === 'crm_id') {
      matchStatus = 'existing'
    } else if (existing) {
      matchStatus = 'linked'
    }

    preview.push({
      ...account,
      matchStatus,
      existingCompanyId: existing?.id,
      selected: matchStatus === 'new',
    })
  }

  return preview
}

async function enrichCompaniesWithBrandfetch(
  supabase: SupabaseClient,
  organizationId: string,
  companyIds: string[],
): Promise<number> {
  let enriched = 0

  for (const companyId of companyIds) {
    try {
      const result = await syncExistingAccountBrandfetch(
        supabase,
        organizationId,
        companyId,
      )
      if (result.success) enriched += 1
    } catch {
      // Einzelner Fehler blockiert den Rest nicht.
    }
  }

  return enriched
}

export async function importCrmAccounts(
  supabase: SupabaseClient,
  organizationId: string,
  provider: CrmProvider,
  selectedAccounts: CrmAccountCandidate[],
): Promise<CrmImportResult> {
  if (!selectedAccounts.length) {
    return {
      success: false,
      createdAccounts: 0,
      linkedAccounts: 0,
      skippedAccounts: 0,
      createdDeals: 0,
      skippedDeals: 0,
      enrichedAccounts: 0,
      error: 'Keine Accounts ausgewählt.',
    }
  }

  let createdAccounts = 0
  let linkedAccounts = 0
  let skippedAccounts = 0
  let createdDeals = 0
  let skippedDeals = 0
  const enrichCompanyIds: string[] = []

  for (const account of selectedAccounts) {
    const name = account.name.trim()
    if (!name) {
      skippedAccounts += 1
      continue
    }

    const existing = await findExistingCompanyForCrmImport(supabase, organizationId, {
      provider,
      externalAccountId: account.externalAccountId,
      name,
      website: account.website,
    })

    let companyId: string | null = existing?.id ?? null

    if (!companyId) {
      const { data: inserted, error } = await supabase
        .from('companies')
        .insert({
          organization_id: organizationId,
          entity_kind: 'account',
          name,
          website_url: account.website?.trim() || null,
          crm_provider: provider,
          crm_account_id: account.externalAccountId,
          account_status: null,
        })
        .select('id')
        .single()

      if (error || !inserted?.id) {
        skippedAccounts += 1
        continue
      }

      const newCompanyId = inserted.id
      companyId = newCompanyId
      createdAccounts += 1
      enrichCompanyIds.push(newCompanyId)
    } else {
      const updates: Record<string, string | null> = {}
      if (!existing?.matchReason || existing.matchReason !== 'crm_id') {
        updates.crm_provider = provider
        updates.crm_account_id = account.externalAccountId
      }
      if (account.website?.trim()) {
        updates.website_url = account.website.trim()
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('companies').update(updates).eq('id', companyId)
      }

      if (existing?.matchReason === 'crm_id') {
        skippedAccounts += 1
      } else {
        linkedAccounts += 1
        enrichCompanyIds.push(companyId)
      }
    }

    if (!companyId) {
      skippedAccounts += 1
      continue
    }

    for (const opportunity of account.opportunities) {
      const oppId = opportunity.externalOpportunityId.trim()
      if (!oppId) continue

      const { data: existingDeal } = await supabase
        .from('deals')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('crm_source', provider)
        .eq('crm_opportunity_id', oppId)
        .maybeSingle()

      if (existingDeal?.id) {
        skippedDeals += 1
        continue
      }

      const status = mapHubSpotStageToDealStatus(opportunity.stage)
      if (status === 'won' || status === 'lost') {
        skippedDeals += 1
        continue
      }

      const dealPayload = {
        organization_id: organizationId,
        company_id: companyId,
        title: opportunity.title.trim() || 'Unbenannter Deal',
        volume: formatHubSpotAmount(opportunity.amount),
        status,
        expiry_date: opportunity.closeDate?.slice(0, 10) ?? null,
        crm_source: provider,
        crm_opportunity_id: oppId,
        crm_stage: opportunity.stage?.trim() || null,
        crm_synced_at: new Date().toISOString(),
      }

      let { error: dealError } = await supabase.from('deals').insert(dealPayload)

      if (dealError?.code === 'PGRST204' && dealError.message?.includes('crm_stage')) {
        const { crm_stage, ...dealPayloadWithoutStage } = dealPayload
        void crm_stage
        ;({ error: dealError } = await supabase
          .from('deals')
          .insert(dealPayloadWithoutStage))
      }

      if (dealError) {
        skippedDeals += 1
        continue
      }
      createdDeals += 1
    }
  }

  const enrichedAccounts = await enrichCompaniesWithBrandfetch(supabase, organizationId, [
    ...new Set(enrichCompanyIds),
  ])

  if (provider === 'hubspot') {
    await syncHubSpotWonDealsForOrganization(supabase, organizationId, provider)
  }

  await touchOrganizationCrmLastSync(supabase, organizationId, provider)

  return {
    success: true,
    createdAccounts,
    linkedAccounts,
    skippedAccounts,
    createdDeals,
    skippedDeals,
    enrichedAccounts,
  }
}

import 'server-only'

import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import { buildRfpCoverageReport } from '@/lib/rfp-coverage'
import type { RfpCoverageRow } from '@/lib/rfp-coverage-types'
import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type DbClient = SupabaseClient<Database>

export function dealProofCoverageTag(dealId: string): string {
  return `deal-proof-coverage:${dealId}`
}

async function loadDealRequirements(
  supabase: DbClient,
  dealId: string,
  organizationId: string
): Promise<ExtractedRfpRequirement[]> {
  const { data, error } = await supabase
    .from('deal_requirements')
    .select('id, label, sort_order')
    .eq('deal_id', dealId)
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    if (/deal_requirements/i.test(error.message ?? '')) return []
    return []
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    text: String(row.label),
  }))
}

async function computeDealProofCoverage(
  supabase: DbClient,
  params: {
    organizationId: string
    dealId: string
    salesVisibleOnly: boolean
    apiKey: string
  }
): Promise<{ dealTitle: string | null; coverage: RfpCoverageRow[] }> {
  const { organizationId, dealId, salesVisibleOnly, apiKey } = params

  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .select('id, title, industry, volume')
    .eq('id', dealId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (dealErr || !deal) {
    return { dealTitle: null, coverage: [] }
  }

  const requirements = await loadDealRequirements(supabase, dealId, organizationId)
  if (requirements.length === 0) {
    return { dealTitle: deal.title ?? null, coverage: [] }
  }

  const coverage = await buildRfpCoverageReport(supabase, {
    apiKey,
    organizationId,
    salesVisibleOnly,
    deal: {
      title: deal.title ?? null,
      industry: deal.industry ?? null,
      volume: deal.volume ?? null,
    },
    requirements,
  })

  return { dealTitle: deal.title ?? null, coverage }
}

export async function getCachedDealProofCoverage(params: {
  organizationId: string
  dealId: string
  salesVisibleOnly: boolean
  apiKey: string
}): Promise<{ dealTitle: string | null; coverage: RfpCoverageRow[] }> {
  const { organizationId, dealId, salesVisibleOnly, apiKey } = params
  const visibilityKey = salesVisibleOnly ? 'sales' : 'all'
  const cacheKey = `deal-proof-coverage:${organizationId}:${dealId}:${visibilityKey}`

  const admin = createServiceRoleSupabaseClient()
  const run = async () => {
    const client = admin ?? (await createServerSupabaseClient())
    return computeDealProofCoverage(client, params)
  }

  if (!admin) {
    return run()
  }

  return unstable_cache(
    () => computeDealProofCoverage(admin, params),
    [cacheKey],
    { tags: [dealProofCoverageTag(dealId)], revalidate: 300 }
  )()
}

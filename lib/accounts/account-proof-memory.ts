import 'server-only'

import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  accountProofMemoryDealFilter,
  applySalesVisibleReferenceFilters,
} from '@/lib/accounts/account-proof-memory-filters'
import {
  buildAccountProofMemory,
  type AccountProofMemory,
} from '@/lib/accounts/account-proof-memory-pure'
import type { Database } from '@/lib/database.types'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type DbClient = SupabaseClient<Database>

export type { AccountProofMemory, AccountProofHistoryItem, AccountProofImpactRow } from '@/lib/accounts/account-proof-memory-pure'

export function accountProofMemoryTag(companyId: string): string {
  return `account-proof-memory:${companyId}`
}

async function computeAccountProofMemory(
  supabase: DbClient,
  params: {
    organizationId: string
    companyId: string
    salesVisibleOnly: boolean
  }
): Promise<AccountProofMemory> {
  const { organizationId, companyId, salesVisibleOnly } = params

  const { data: deals, error: dealsErr } = await accountProofMemoryDealFilter(
    supabase.from('deals').select('id, title, status, decisive_reference_id, updated_at'),
    organizationId,
    companyId
  )

  if (dealsErr || !deals?.length) {
    return { impact: [], history: [], lastWonWithProof: null }
  }

  const dealIds = deals.map((d) => d.id)
  const dealTitleById = new Map(deals.map((d) => [d.id, d.title ?? '—']))

  const { data: drRows } = await supabase
    .from('deal_references')
    .select('deal_id, reference_id')
    .in('deal_id', dealIds)

  const refIdSet = new Set<string>()
  for (const row of drRows ?? []) {
    if (row.reference_id) refIdSet.add(String(row.reference_id))
  }
  for (const deal of deals) {
    if (deal.decisive_reference_id) refIdSet.add(String(deal.decisive_reference_id))
  }

  const refIds = Array.from(refIdSet)
  if (!refIds.length) {
    return buildAccountProofMemory({
      deals,
      dealReferences: drRows ?? [],
      events: [],
      visibleRefIds: new Set(),
      refTitleById: new Map(),
      dealTitleById,
    })
  }

  let refQuery = supabase
    .from('references')
    .select('id, title, status')
    .eq('organization_id', organizationId)
    .in('id', refIds)
    .is('deleted_at', null)

  if (salesVisibleOnly) {
    refQuery = applySalesVisibleReferenceFilters(refQuery)
  }

  const { data: refs } = await refQuery
  const visibleRefIds = new Set((refs ?? []).map((r) => r.id))
  const refTitleById = new Map((refs ?? []).map((r) => [r.id, r.title ?? '—']))

  const [{ data: dealEvents }, { data: viewEvents }] = await Promise.all([
    supabase
      .from('evidence_events')
      .select('id, created_at, event_type, deal_id, reference_id, payload')
      .eq('organization_id', organizationId)
      .in('deal_id', dealIds)
      .in('event_type', ['reference_shared', 'deal_won', 'deal_lost', 'deal_withdrawn']),
    supabase
      .from('evidence_events')
      .select('id, created_at, event_type, deal_id, reference_id, payload')
      .eq('organization_id', organizationId)
      .eq('event_type', 'share_link_viewed')
      .in('reference_id', refIds),
  ])

  const events = [...(dealEvents ?? []), ...(viewEvents ?? [])]

  return buildAccountProofMemory({
    deals,
    dealReferences: drRows ?? [],
    events,
    visibleRefIds,
    refTitleById,
    dealTitleById,
  })
}

/** Direkt mit Session-Client (RLS) — für Tests und Sales-Sicht. */
export async function loadAccountProofMemory(
  supabase: DbClient,
  params: {
    organizationId: string
    companyId: string
    salesVisibleOnly: boolean
  }
): Promise<AccountProofMemory> {
  return computeAccountProofMemory(supabase, params)
}

export async function getCachedAccountProofMemory(params: {
  organizationId: string
  companyId: string
  salesVisibleOnly: boolean
}): Promise<AccountProofMemory> {
  const { organizationId, companyId, salesVisibleOnly } = params

  // Sales-Sicht: Session-Client + RLS (kein Draft/NDA-Leak über Service-Role-Cache).
  if (salesVisibleOnly) {
    const client = await createServerSupabaseClient()
    return loadAccountProofMemory(client, params)
  }

  const visibilityKey = 'all'
  const cacheKey = `account-proof-memory:${organizationId}:${companyId}:${visibilityKey}`

  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    const client = await createServerSupabaseClient()
    return computeAccountProofMemory(client, params)
  }

  return unstable_cache(
    () => computeAccountProofMemory(admin, params),
    [cacheKey],
    { tags: [accountProofMemoryTag(companyId)], revalidate: 300 }
  )()
}

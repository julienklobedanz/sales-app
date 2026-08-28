import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { DealStatus } from '@/app/(app)/deals/types'
import type { DealDocumentRow } from '@/app/(app)/deals/document-actions'
import { listTenderDocuments } from '@/app/(app)/deals/document-actions'
import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { bidDecisionFromDb } from '@/lib/deal-desk/workspace-merge'
import { resolveDealDeskProject } from '@/lib/deal-desk/resolve-deal-desk-project'
import { listTenderDeadlines } from '@/lib/deals/deadlines'
import type { DealDeadlineRow } from '@/lib/deals/deadline-display'
import { loadDealProofSummary } from '@/lib/deals/load-deal-proof-summary'
import { normalizeDealStatus } from '@/lib/deals/normalize-deal-status'
import type { Database } from '@/lib/database.types'
import { deriveTenderStatus, type DerivedTenderStatus } from './derive-tender-status'

type TenderPageLot = {
  id: string
  title: string
  volume: string | null
  status: DealStatus
  account_manager_id: string | null
  sales_manager_id: string | null
  account_manager_name: string | null
  account_manager_avatar_url: string | null
  sales_manager_name: string | null
  sales_manager_avatar_url: string | null
  bidDecision: 'go' | 'no-bid' | null
  proofCount: number
  proofBestScore: number | null
}

export type TenderPageData = {
  id: string
  title: string
  company_id: string | null
  company_name: string | null
  procedure_type: string | null
  reference_number: string | null
  total_volume: string | null
  max_lots_bid: number | null
  max_lots_award: number | null
  lot_priority_required: boolean | null
  derivedStatus: DerivedTenderStatus
  lots: TenderPageLot[]
  deadlines: DealDeadlineRow[]
  documents: DealDocumentRow[]
}

type TenderLotDeskBidRow = {
  deal_id: string | null
  bid_decision: string | null
  updated_at: string
  archived_at: string | null
}

export async function loadTenderPageData(
  supabase: SupabaseClient<Database>,
  args: { tenderId: string; organizationId: string },
): Promise<TenderPageData | null> {
  const { data: tender, error } = await supabase
    .from('tenders')
    .select(
      'id, title, company_id, procedure_type, reference_number, total_volume, max_lots_bid, max_lots_award, lot_priority_required, companies ( name )',
    )
    .eq('id', args.tenderId)
    .eq('organization_id', args.organizationId)
    .maybeSingle()

  if (error || !tender) return null

  const { data: lotRows } = await supabase
    .from('deals')
    .select('id, title, volume, status, account_manager_id, sales_manager_id')
    .eq('tender_id', tender.id)
    .eq('organization_id', args.organizationId)
    .order('title', { ascending: true })

  const accountManagerIds = [
    ...new Set((lotRows ?? []).map((r) => r.account_manager_id).filter(Boolean)),
  ] as string[]
  const salesManagerIds = [
    ...new Set((lotRows ?? []).map((r) => r.sales_manager_id).filter(Boolean)),
  ] as string[]
  const allUserIds = [...new Set([...accountManagerIds, ...salesManagerIds])]
  const lotIds = (lotRows ?? []).map((row) => row.id)

  const names: Record<string, string> = {}
  const avatars: Record<string, string | null> = {}
  const bidByDeal = new Map<string, 'go' | 'no-bid'>()
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', allUserIds)
    for (const p of profiles ?? []) {
      names[p.id] = p.full_name ?? p.id.slice(0, 8)
      avatars[p.id] = p.avatar_url ?? null
    }
  }

  const bidPromise =
    lotIds.length > 0
      ? supabase
          .from('deal_desk_projects')
          .select('deal_id, bid_decision, updated_at, archived_at')
          .eq('organization_id', args.organizationId)
          .in('deal_id', lotIds)
      : Promise.resolve({
          data: [] as TenderLotDeskBidRow[],
        })

  const [proofByDeal, bidRes] = await Promise.all([
    loadDealProofSummary(supabase, lotIds),
    bidPromise,
  ])

  const byDeal = new Map<string, TenderLotDeskBidRow[]>()
  for (const row of bidRes.data ?? []) {
    if (!row.deal_id) continue
    const list = byDeal.get(row.deal_id) ?? []
    list.push(row)
    byDeal.set(row.deal_id, list)
  }
  for (const [dealId, rows] of byDeal) {
    const picked = resolveDealDeskProject(rows)
    if (!picked) continue
    const decision = bidDecisionFromDb(picked.bid_decision)
    if (decision) bidByDeal.set(dealId, decision)
  }

  const lots: TenderPageLot[] = (lotRows ?? []).map((row) => {
    const proof = proofByDeal[row.id] ?? { count: 0, bestScore: null }
    return {
      id: row.id,
      title: row.title ?? '',
      volume: row.volume ?? null,
      status: normalizeDealStatus(row.status),
      account_manager_id: row.account_manager_id ?? null,
      sales_manager_id: row.sales_manager_id ?? null,
      account_manager_name: row.account_manager_id
        ? (names[row.account_manager_id] ?? null)
        : null,
      account_manager_avatar_url: row.account_manager_id
        ? (avatars[row.account_manager_id] ?? null)
        : null,
      sales_manager_name: row.sales_manager_id
        ? (names[row.sales_manager_id] ?? null)
        : null,
      sales_manager_avatar_url: row.sales_manager_id
        ? (avatars[row.sales_manager_id] ?? null)
        : null,
      bidDecision: bidByDeal.get(row.id) ?? null,
      proofCount: proof.count,
      proofBestScore: proof.bestScore,
    }
  })

  const [deadlines, documentsResult] = await Promise.all([
    listTenderDeadlines(supabase, tender.id),
    listTenderDocuments(tender.id),
  ])
  const documents = documentsResult.success ? documentsResult.rows : []

  return {
    id: tender.id,
    title: tender.title,
    company_id: tender.company_id,
    company_name: accountFromJoin(tender.companies)?.name ?? null,
    procedure_type: tender.procedure_type,
    reference_number: tender.reference_number,
    total_volume: tender.total_volume,
    max_lots_bid: tender.max_lots_bid,
    max_lots_award: tender.max_lots_award,
    lot_priority_required: tender.lot_priority_required,
    derivedStatus: deriveTenderStatus(lots.map((lot) => lot.status)),
    lots,
    deadlines,
    documents,
  }
}

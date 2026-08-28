import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { DealStatus } from '@/app/(app)/deals/types'
import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { listDealDeadlines } from '@/lib/deals/deadlines'
import type { DealDeadlineRow } from '@/lib/deals/deadline-display'
import { normalizeDealStatus } from '@/lib/deals/normalize-deal-status'
import type { Database } from '@/lib/database.types'
import { deriveTenderStatus, type DerivedTenderStatus } from './derive-tender-status'

type TenderPageLot = {
  id: string
  title: string
  volume: string | null
  status: DealStatus
}

export type TenderPageData = {
  id: string
  title: string
  company_id: string | null
  company_name: string | null
  procedure_type: string | null
  reference_number: string | null
  total_volume: string | null
  derivedStatus: DerivedTenderStatus
  lots: TenderPageLot[]
  deadlines: DealDeadlineRow[]
}

export async function loadTenderPageData(
  supabase: SupabaseClient<Database>,
  args: { tenderId: string; organizationId: string },
): Promise<TenderPageData | null> {
  const { data: tender, error } = await supabase
    .from('tenders')
    .select(
      'id, title, company_id, procedure_type, reference_number, total_volume, companies ( name )',
    )
    .eq('id', args.tenderId)
    .eq('organization_id', args.organizationId)
    .maybeSingle()

  if (error || !tender) return null

  const { data: lotRows } = await supabase
    .from('deals')
    .select('id, title, volume, status')
    .eq('tender_id', tender.id)
    .eq('organization_id', args.organizationId)
    .order('title', { ascending: true })

  const lots: TenderPageLot[] = (lotRows ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? '',
    volume: row.volume ?? null,
    status: normalizeDealStatus(row.status),
  }))

  const deadlineLists = await Promise.all(
    lots.map((lot) => listDealDeadlines(supabase, lot.id)),
  )
  const deadlines = deadlineLists.flat().sort((a, b) => {
    if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at)
    if (a.due_at) return -1
    if (b.due_at) return 1
    return a.label.localeCompare(b.label)
  })

  return {
    id: tender.id,
    title: tender.title,
    company_id: tender.company_id,
    company_name: accountFromJoin(tender.companies)?.name ?? null,
    procedure_type: tender.procedure_type,
    reference_number: tender.reference_number,
    total_volume: tender.total_volume,
    derivedStatus: deriveTenderStatus(lots.map((lot) => lot.status)),
    lots,
    deadlines,
  }
}

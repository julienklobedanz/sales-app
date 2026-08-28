import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { DealStatus } from '@/app/(app)/deals/types'
import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { listTenderDeadlines } from '@/lib/deals/deadlines'
import type { DealDeadlineRow } from '@/lib/deals/deadline-display'
import { normalizeDealStatus } from '@/lib/deals/normalize-deal-status'
import type { Database } from '@/lib/database.types'
import { deriveTenderStatus, type DerivedTenderStatus } from './derive-tender-status'

type TenderPageLot = {
  id: string
  title: string
  volume: string | null
  status: DealStatus
  account_manager_name: string | null
  account_manager_avatar_url: string | null
  sales_manager_name: string | null
  sales_manager_avatar_url: string | null
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

  const names: Record<string, string> = {}
  const avatars: Record<string, string | null> = {}
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

  const lots: TenderPageLot[] = (lotRows ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? '',
    volume: row.volume ?? null,
    status: normalizeDealStatus(row.status),
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
  }))

  const deadlines = await listTenderDeadlines(supabase, tender.id)

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

import type { DealRow } from '@/app/(app)/deals/types'
import {
  compareResolvedDeadlines,
  earliestResolvedDeadline,
  type ResolvedDealDeadline,
} from '@/lib/deals/resolve-deal-deadline'
import { ROUTES } from '@/lib/routes'
import { deriveTenderStatus } from './derive-tender-status'
import { formatTenderStatusLabel } from './tender-status-label'

export type DealCollectionLotRow = DealRow & {
  rowKind: 'lot'
  href: string
  collectionOrder: number
}

export type DealCollectionBandRow = {
  rowKind: 'band'
  id: string
  href: string
  title: string
  companyName: string | null
  nextDeadline: ResolvedDealDeadline
  derivedStatusLabel: string
  collectionOrder: number
}

export type DealCollectionRow = DealCollectionLotRow | DealCollectionBandRow

export function isDealCollectionLotRow(
  row: DealCollectionRow,
): row is DealCollectionLotRow {
  return row.rowKind === 'lot'
}

function asLotRow(deal: DealRow): DealCollectionLotRow {
  return {
    ...deal,
    rowKind: 'lot',
    href: ROUTES.deals.detail(deal.id),
    collectionOrder: 0,
  }
}

export function groupDealsForCollection(deals: DealRow[]): DealCollectionRow[] {
  const ungrouped: DealRow[] = []
  const byTender = new Map<string, DealRow[]>()

  for (const deal of deals) {
    if (!deal.tender_id || !deal.tender) {
      ungrouped.push(deal)
      continue
    }
    const lots = byTender.get(deal.tender_id) ?? []
    lots.push(deal)
    byTender.set(deal.tender_id, lots)
  }

  type Bucket = { deadline: ResolvedDealDeadline; rows: DealCollectionRow[] }
  const buckets: Bucket[] = []

  for (const deal of ungrouped) {
    buckets.push({
      deadline: deal.deadline,
      rows: [asLotRow(deal)],
    })
  }

  for (const lots of byTender.values()) {
    if (lots.length <= 1) {
      for (const deal of lots) {
        buckets.push({
          deadline: deal.deadline,
          rows: [asLotRow(deal)],
        })
      }
      continue
    }

    const tender = lots[0]!.tender!
    const nextDeadline = earliestResolvedDeadline(lots.map((lot) => lot.deadline))
    const derivedStatus = deriveTenderStatus(lots.map((lot) => lot.status))
    const band: DealCollectionBandRow = {
      rowKind: 'band',
      id: `tender:${tender.id}`,
      href: ROUTES.tenders.detail(tender.id),
      title: tender.title,
      companyName: tender.company_name,
      nextDeadline,
      derivedStatusLabel: formatTenderStatusLabel(derivedStatus),
      collectionOrder: 0,
    }

    buckets.push({ deadline: nextDeadline, rows: [band, ...lots.map(asLotRow)] })
  }

  buckets.sort((a, b) => compareResolvedDeadlines(a.deadline, b.deadline))

  return buckets
    .flatMap((bucket) => bucket.rows)
    .map((row, index) => ({
      ...row,
      collectionOrder: index,
    }))
}

import type { DealRow } from '@/app/(app)/deals/types'
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
  nextDeadline: string | null
  derivedStatusLabel: string
  collectionOrder: number
}

export type DealCollectionRow = DealCollectionLotRow | DealCollectionBandRow

export function isDealCollectionLotRow(
  row: DealCollectionRow,
): row is DealCollectionLotRow {
  return row.rowKind === 'lot'
}

function earliestExpiry(dates: Array<string | null>): string | null {
  const filled = dates.filter((value): value is string => Boolean(value))
  if (filled.length === 0) return null
  return [...filled].sort()[0] ?? null
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

  type Bucket = { sortDate: string | null; rows: DealCollectionRow[] }
  const buckets: Bucket[] = []

  for (const deal of ungrouped) {
    buckets.push({
      sortDate: deal.expiry_date,
      rows: [asLotRow(deal)],
    })
  }

  for (const lots of byTender.values()) {
    if (lots.length <= 1) {
      for (const deal of lots) {
        buckets.push({
          sortDate: deal.expiry_date,
          rows: [asLotRow(deal)],
        })
      }
      continue
    }

    const tender = lots[0]!.tender!
    const sortDate = earliestExpiry(lots.map((lot) => lot.expiry_date))
    const derivedStatus = deriveTenderStatus(lots.map((lot) => lot.status))
    const band: DealCollectionBandRow = {
      rowKind: 'band',
      id: `tender:${tender.id}`,
      href: ROUTES.tenders.detail(tender.id),
      title: tender.title,
      companyName: tender.company_name,
      nextDeadline: sortDate,
      derivedStatusLabel: formatTenderStatusLabel(derivedStatus),
      collectionOrder: 0,
    }

    buckets.push({ sortDate, rows: [band, ...lots.map(asLotRow)] })
  }

  buckets.sort((a, b) => {
    if (a.sortDate === b.sortDate) return 0
    if (!a.sortDate) return 1
    if (!b.sortDate) return -1
    return a.sortDate.localeCompare(b.sortDate)
  })

  return buckets
    .flatMap((bucket) => bucket.rows)
    .map((row, index) => ({
      ...row,
      collectionOrder: index,
    }))
}

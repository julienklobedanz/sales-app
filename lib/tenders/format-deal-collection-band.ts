import { formatDealCollectionDeadline } from '@/app/(app)/deals/deals-table-format'

const EMPTY_STATUS_PLACEHOLDER = '—'

export function formatDealCollectionBandLabel(
  band: {
    title: string
    companyName: string | null
    nextDeadline: string | null
    derivedStatusLabel: string
  },
  now?: Date,
): string {
  const parts = [band.title]
  if (band.companyName) parts.push(band.companyName)
  if (band.nextDeadline) {
    parts.push(formatDealCollectionDeadline(band.nextDeadline, now))
  }
  if (band.derivedStatusLabel && band.derivedStatusLabel !== EMPTY_STATUS_PLACEHOLDER) {
    parts.push(band.derivedStatusLabel)
  }
  return parts.join(' · ')
}

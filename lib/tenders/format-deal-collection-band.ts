import { formatResolvedCollectionDeadline } from '@/app/(app)/deals/deals-table-format'
import type { ResolvedDealDeadline } from '@/lib/deals/resolve-deal-deadline'

const EMPTY_STATUS_PLACEHOLDER = '—'

export function formatDealCollectionBandLabel(
  band: {
    title: string
    companyName: string | null
    nextDeadline: ResolvedDealDeadline
    derivedStatusLabel: string
  },
  now?: Date,
): string {
  const parts = [band.title]
  if (band.companyName) parts.push(band.companyName)
  const deadlineLabel = formatResolvedCollectionDeadline(band.nextDeadline, now)
  if (deadlineLabel) parts.push(deadlineLabel)
  if (band.derivedStatusLabel && band.derivedStatusLabel !== EMPTY_STATUS_PLACEHOLDER) {
    parts.push(band.derivedStatusLabel)
  }
  return parts.join(' · ')
}

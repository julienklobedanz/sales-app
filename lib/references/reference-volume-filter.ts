import { parseReferenceVolume } from '@/lib/format'

export type ReferenceVolumeFilter =
  | 'all'
  | 'under_100k'
  | '100k_500k'
  | '500k_1m'
  | '1m_5m'
  | 'over_5m'
  | 'unspecified'

export const REFERENCE_VOLUME_FILTER_OPTIONS: ReadonlyArray<{
  value: ReferenceVolumeFilter
  label: string
}> = [
  { value: 'all', label: 'Alle' },
  { value: 'under_100k', label: 'unter 100k' },
  { value: '100k_500k', label: '100k – 500k' },
  { value: '500k_1m', label: '500k – 1 Mio.' },
  { value: '1m_5m', label: '1 – 5 Mio.' },
  { value: 'over_5m', label: 'über 5 Mio.' },
  { value: 'unspecified', label: 'Ohne Angabe' },
]

export function referenceVolumeAmountEur(
  volumeEur: string | null | undefined,
): number | null {
  const parsed = parseReferenceVolume(volumeEur)
  if (!parsed) return null
  const amount = Number(parsed.amountDigits)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount
}

export function matchesReferenceVolumeFilter(
  volumeEur: string | null | undefined,
  filter: ReferenceVolumeFilter,
): boolean {
  if (filter === 'all') return true
  const amount = referenceVolumeAmountEur(volumeEur)
  if (filter === 'unspecified') return amount === null
  if (amount === null) return false
  switch (filter) {
    case 'under_100k':
      return amount < 100_000
    case '100k_500k':
      return amount >= 100_000 && amount < 500_000
    case '500k_1m':
      return amount >= 500_000 && amount < 1_000_000
    case '1m_5m':
      return amount >= 1_000_000 && amount < 5_000_000
    case 'over_5m':
      return amount >= 5_000_000
    default:
      return true
  }
}

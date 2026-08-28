import type { FactRow } from '@/components/dashboard/facts-dl'
import { COPY } from '@/lib/copy'

export const LOT_PRIORITY_SELECT_VALUES = ['unknown', 'yes', 'no'] as const

export type LotPrioritySelectValue = (typeof LOT_PRIORITY_SELECT_VALUES)[number]

const POSITIVE_INT_ERROR = 'Die Los-Höchstzahl muss größer als 0 sein.'

export function formatLotAwardLimit(count: number | null | undefined): string {
  if (count == null) return COPY.tenders.unknown
  if (count === 1) return COPY.tenders.lotCountSingular
  return COPY.tenders.lotCountPlural.replace('{count}', String(count))
}

export function formatLotPriorityRequired(value: boolean | null | undefined): string {
  if (value === true) return COPY.tenders.yes
  if (value === false) return COPY.tenders.no
  return COPY.tenders.unknown
}

export function lotPrioritySelectFromDb(
  value: boolean | null | undefined,
): LotPrioritySelectValue {
  if (value === true) return 'yes'
  if (value === false) return 'no'
  return 'unknown'
}

export function parseLotPrioritySelect(value: string): boolean | null {
  if (value === 'yes') return true
  if (value === 'no') return false
  return null
}

export function parseOptionalPositiveInt(
  raw: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, value: null }
  if (!/^\d+$/.test(trimmed)) return { ok: false, error: POSITIVE_INT_ERROR }
  const n = Number(trimmed)
  if (n <= 0) return { ok: false, error: POSITIVE_INT_ERROR }
  return { ok: true, value: n }
}

export function buildLotAwardLimitFactRows(args: {
  maxLotsBid: number | null
  maxLotsAward: number | null
  lotPriorityRequired: boolean | null
}): FactRow[] {
  return [
    {
      key: 'max_lots_bid',
      label: COPY.tenders.maxLotsBid,
      value: formatLotAwardLimit(args.maxLotsBid),
    },
    {
      key: 'max_lots_award',
      label: COPY.tenders.maxLotsAward,
      value: formatLotAwardLimit(args.maxLotsAward),
    },
    {
      key: 'lot_priority_required',
      label: COPY.tenders.lotPriorityRequired,
      value: formatLotPriorityRequired(args.lotPriorityRequired),
    },
  ]
}

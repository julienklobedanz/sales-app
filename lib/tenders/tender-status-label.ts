import { COPY } from '@/lib/copy'

import type { DerivedTenderStatus } from './derive-tender-status'

export function formatTenderStatusLabel(status: DerivedTenderStatus): string {
  if (status.kind === 'empty') return '—'
  if (status.kind === 'won') return COPY.tenders.statusWon
  if (status.kind === 'lost') return COPY.tenders.statusLost
  if (status.kind === 'partially_won') return COPY.tenders.statusPartiallyWon
  if (status.won > 0) {
    return `${COPY.tenders.statusRunning} · ${COPY.tenders.wonOfBid
      .replace('{won}', String(status.won))
      .replace('{bid}', String(status.bid))}`
  }
  return COPY.tenders.statusRunning
}

export function formatTenderLotCount(count: number): string {
  if (count === 1) return COPY.tenders.lotCountSingular
  return COPY.tenders.lotCountPlural.replace('{count}', String(count))
}

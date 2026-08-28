import { describe, expect, it } from 'vitest'

import { deriveTenderStatus } from './derive-tender-status'
import { formatTenderStatusLabel } from './tender-status-label'
import { STATUS_FILTER_OPTIONS } from '@/app/(app)/deals/deals-table-constants'

describe('deriveTenderStatus', () => {
  it('läuft, sobald ein gebotenes Los offen ist', () => {
    expect(deriveTenderStatus(['won', 'negotiation', 'withdrawn'])).toEqual({
      kind: 'running',
      won: 1,
      bid: 2,
    })
  })

  it('zeigt „1 von 2 gewonnen“ nur wenn won > 0', () => {
    const withWin = deriveTenderStatus(['won', 'negotiation', 'withdrawn'])
    expect(formatTenderStatusLabel(withWin)).toBe('läuft · 1 von 2 gewonnen')

    const withoutWin = deriveTenderStatus(['negotiation', 'open'])
    expect(formatTenderStatusLabel(withoutWin)).toBe('läuft')
  })

  it('alle entschieden, alle gewonnen → won', () => {
    expect(deriveTenderStatus(['won', 'won'])).toEqual({ kind: 'won' })
  })

  it('alle entschieden, alle verloren → lost', () => {
    expect(deriveTenderStatus(['lost', 'lost'])).toEqual({ kind: 'lost' })
  })

  it('alle entschieden, gemischt → partially_won', () => {
    expect(deriveTenderStatus(['won', 'lost'])).toEqual({ kind: 'partially_won' })
    expect(formatTenderStatusLabel({ kind: 'partially_won' })).toBe('teilweise gewonnen')
  })

  it('zieht withdrawn und archived aus dem Nenner', () => {
    expect(deriveTenderStatus(['won', 'won', 'withdrawn'])).toEqual({ kind: 'won' })
    expect(deriveTenderStatus(['won', 'archived'])).toEqual({ kind: 'won' })
  })

  it('ohne gebotene Lose → empty', () => {
    expect(deriveTenderStatus(['withdrawn', 'archived'])).toEqual({ kind: 'empty' })
    expect(deriveTenderStatus([])).toEqual({ kind: 'empty' })
  })

  it('partially_won steht nicht in der Status-Select', () => {
    expect(STATUS_FILTER_OPTIONS.map((option) => option.value)).not.toContain(
      'partially_won',
    )
  })
})

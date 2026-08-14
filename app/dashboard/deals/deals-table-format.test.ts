import { describe, expect, it } from 'vitest'

import { isDealExpiringIn30Days } from './deals-table-format'

function isoDaysFromToday(days: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

describe('isDealExpiringIn30Days', () => {
  it('ist wahr für ein Datum in den nächsten 30 Tagen', () => {
    expect(isDealExpiringIn30Days(isoDaysFromToday(15), 'open')).toBe(true)
    expect(isDealExpiringIn30Days(isoDaysFromToday(0), 'rfp')).toBe(true)
    expect(isDealExpiringIn30Days(isoDaysFromToday(30), 'negotiation')).toBe(true)
  })

  it('ist falsch für Vergangenheit und für mehr als 30 Tage', () => {
    expect(isDealExpiringIn30Days(isoDaysFromToday(-400), 'open')).toBe(false)
    expect(isDealExpiringIn30Days(isoDaysFromToday(31), 'open')).toBe(false)
  })

  it('färbt abgeschlossene Deals nicht als hot', () => {
    const soon = isoDaysFromToday(10)
    expect(isDealExpiringIn30Days(soon, 'won')).toBe(false)
    expect(isDealExpiringIn30Days(soon, 'lost')).toBe(false)
    expect(isDealExpiringIn30Days(soon, 'archived')).toBe(false)
    expect(isDealExpiringIn30Days(soon, 'withdrawn')).toBe(false)
  })
})

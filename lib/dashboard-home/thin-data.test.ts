import { describe, expect, it } from 'vitest'

import { isThinDashboardContext } from '@/lib/dashboard-home/thin-data'

describe('isThinDashboardContext', () => {
  it('ist dünn bei wenig Referenzen, Deals und Events', () => {
    expect(
      isThinDashboardContext({ referenceCount: 1, dealCount: 0, eventCount: 3 }),
    ).toBe(true)
  })

  it('ist nicht dünn wenn genug Volumen da ist', () => {
    expect(
      isThinDashboardContext({ referenceCount: 5, dealCount: 3, eventCount: 20 }),
    ).toBe(false)
  })
})

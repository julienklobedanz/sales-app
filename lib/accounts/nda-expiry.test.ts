import { describe, expect, it } from 'vitest'

import {
  NDA_EXPIRY_WARNING_DAYS,
  buildNdaExpiryNotificationText,
  ndaDaysUntilExpiry,
  ndaExpiryUrgency,
  shouldNotifyNdaExpiry,
} from './nda-expiry'

describe('nda-expiry', () => {
  const ref = new Date('2026-05-27T10:00:00')

  it('uses 30-day warning window', () => {
    expect(NDA_EXPIRY_WARNING_DAYS).toBe(30)
    expect(ndaExpiryUrgency(31)).toBeNull()
    expect(ndaExpiryUrgency(30)).toBe('warning')
    expect(ndaExpiryUrgency(7)).toBe('critical')
    expect(ndaExpiryUrgency(-1)).toBe('expired')
  })

  it('skips unlimited and expired status', () => {
    expect(shouldNotifyNdaExpiry({ status: 'active', validUntil: null, refDate: ref })).toBeNull()
    expect(
      shouldNotifyNdaExpiry({ status: 'expired', validUntil: '2026-06-01', refDate: ref })
    ).toBeNull()
  })

  it('notifies for active NDAs within window', () => {
    const result = shouldNotifyNdaExpiry({
      status: 'active',
      validUntil: '2026-06-10',
      refDate: ref,
    })
    expect(result?.daysUntil).toBe(14)
    expect(result?.urgency).toBe('warning')
  })

  it('builds German copy', () => {
    expect(buildNdaExpiryNotificationText('Apple', '2026-05-28', 1)).toContain('morgen')
    expect(buildNdaExpiryNotificationText('Apple', '2026-05-20', -7)).toContain('abgelaufen')
  })

  it('computes day difference in local calendar days', () => {
    expect(ndaDaysUntilExpiry('2026-05-28', ref)).toBe(1)
    expect(ndaDaysUntilExpiry('2026-05-27', ref)).toBe(0)
  })
})

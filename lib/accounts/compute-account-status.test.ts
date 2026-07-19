import { describe, expect, it } from 'vitest'

import { computeAccountStatusFromSignals } from './compute-account-status'

const now = new Date('2026-07-13T12:00:00Z')

describe('computeAccountStatusFromSignals', () => {
  it('returns target when no CRM link and no deals', () => {
    expect(
      computeAccountStatusFromSignals({
        crmAccountId: null,
        deals: [],
        references: [],
        now,
      })
    ).toBe('target')
  })

  it('returns active_customer for won deal within 2 years', () => {
    expect(
      computeAccountStatusFromSignals({
        crmAccountId: 'hs-1',
        deals: [{ status: 'won', closedOn: '2025-06-01' }],
        references: [],
        now,
      })
    ).toBe('active_customer')
  })

  it('returns former_customer when last won is older than 2 years', () => {
    expect(
      computeAccountStatusFromSignals({
        crmAccountId: 'hs-1',
        deals: [{ status: 'won', closedOn: '2022-01-15' }],
        references: [],
        now,
      })
    ).toBe('former_customer')
  })

  it('returns at_risk when reference approval expires soon', () => {
    expect(
      computeAccountStatusFromSignals({
        crmAccountId: 'hs-1',
        deals: [{ status: 'won', closedOn: '2025-06-01' }],
        references: [{ approval_expires_at: '2026-07-20T00:00:00Z', approval_grace_until: null }],
        now,
      })
    ).toBe('at_risk')
  })

  it('returns at_risk when won contract ends within 9 months', () => {
    expect(
      computeAccountStatusFromSignals({
        crmAccountId: 'hs-1',
        deals: [
          {
            status: 'won',
            closedOn: '2025-06-01',
            contractEndDate: '2027-01-15',
          },
        ],
        references: [],
        now,
      })
    ).toBe('at_risk')
  })

  it('keeps active_customer when contract end is beyond 9 months', () => {
    expect(
      computeAccountStatusFromSignals({
        crmAccountId: 'hs-1',
        deals: [
          {
            status: 'won',
            closedOn: '2025-06-01',
            contractEndDate: '2027-08-01',
          },
        ],
        references: [],
        now,
      })
    ).toBe('active_customer')
  })
})

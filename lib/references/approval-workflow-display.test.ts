import { describe, expect, it } from 'vitest'

import {
  formatApprovalDelegatedRecipientLine,
  formatApprovalGiverLine,
  resolveApprovalCoordinatorDisplay,
  resolveCustomerApprovalIntro,
} from './approval-workflow-display'

describe('approval-workflow-display', () => {
  it('formats giver name and title', () => {
    expect(formatApprovalGiverLine('Alex', 'CIO')).toBe('Alex · CIO')
    expect(formatApprovalGiverLine('Alex', null)).toBe('Alex')
  })

  it('formats delegated recipient', () => {
    expect(formatApprovalDelegatedRecipientLine('Maria', 'maria@example.com')).toBe(
      'Maria (maria@example.com)',
    )
    expect(formatApprovalDelegatedRecipientLine(null, 'maria@example.com')).toBe(
      'maria@example.com',
    )
  })

  it('prefers customer-facing coordinator name', () => {
    expect(
      resolveApprovalCoordinatorDisplay({
        customerFacingName: 'Maria AM',
        coordinatorName: 'Alex',
        coordinatorEmail: 'alex@example.com',
      }),
    ).toBe('Maria AM')
  })

  it('derives coordinator display name from email', () => {
    expect(
      resolveApprovalCoordinatorDisplay({
        coordinatorEmail: 'julien.klobedanz@gmail.com',
      }),
    ).toBe('Julien Klobedanz')
  })

  it('builds customer intro with person or org fallback', () => {
    expect(
      resolveCustomerApprovalIntro({
        customerFacingName: 'Maria AM',
        orgName: 'RefStack',
      }),
    ).toEqual({ mode: 'person', personName: 'Maria AM', orgName: 'RefStack' })

    expect(
      resolveCustomerApprovalIntro({
        orgName: 'RefStack',
      }),
    ).toEqual({ mode: 'org', personName: null, orgName: 'RefStack' })
  })
})

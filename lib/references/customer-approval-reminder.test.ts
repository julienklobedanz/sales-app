import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  CUSTOMER_APPROVAL_REMINDER_AFTER_DAYS,
  isCustomerApprovalReminderDue,
} from './customer-approval-reminder'

describe('isCustomerApprovalReminderDue', () => {
  const now = Date.parse('2026-06-24T12:00:00.000Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when last sent is within 14 days', () => {
    const recent = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()
    expect(
      isCustomerApprovalReminderDue({
        lastSentAt: recent,
        reminderSentAt: null,
      }),
    ).toBe(false)
  })

  it('returns true when last sent is older than 14 days and no reminder yet', () => {
    const old = new Date(
      now - (CUSTOMER_APPROVAL_REMINDER_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000,
    ).toISOString()
    expect(
      isCustomerApprovalReminderDue({
        lastSentAt: old,
        reminderSentAt: null,
      }),
    ).toBe(true)
  })

  it('returns false when reminder was already sent after last customer mail', () => {
    const old = new Date(
      now - (CUSTOMER_APPROVAL_REMINDER_AFTER_DAYS + 2) * 24 * 60 * 60 * 1000,
    ).toISOString()
    const reminder = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()
    expect(
      isCustomerApprovalReminderDue({
        lastSentAt: old,
        reminderSentAt: reminder,
      }),
    ).toBe(false)
  })

  it('uses approval_requested_at as fallback when last_sent is missing', () => {
    const old = new Date(
      now - (CUSTOMER_APPROVAL_REMINDER_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000,
    ).toISOString()
    expect(
      isCustomerApprovalReminderDue({
        lastSentAt: null,
        fallbackSentAt: old,
        reminderSentAt: null,
      }),
    ).toBe(true)
  })
})

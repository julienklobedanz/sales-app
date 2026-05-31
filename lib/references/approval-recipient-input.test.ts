import { describe, expect, it } from 'vitest'
import {
  canSubmitApprovalRecipient,
  filterApprovalContactSuggestions,
  isApprovalRecipientEmail,
} from './approval-recipient-input'

describe('approval-recipient-input', () => {
  it('validates email', () => {
    expect(isApprovalRecipientEmail('a@b.co')).toBe(true)
    expect(isApprovalRecipientEmail('not-an-email')).toBe(false)
  })

  it('filters contacts by query', () => {
    const contacts = [
      {
        id: '1',
        email: 'max@firma.de',
        label: 'Max Mustermann · Kundenkontakt',
        kind: 'external_contact' as const,
      },
    ]
    expect(filterApprovalContactSuggestions(contacts, 'max')).toHaveLength(1)
    expect(filterApprovalContactSuggestions(contacts, 'xyz')).toHaveLength(0)
  })

  it('allows submit with email or selected contact', () => {
    expect(canSubmitApprovalRecipient({ query: 'a@b.co', selected: null })).toBe(true)
    expect(
      canSubmitApprovalRecipient({
        query: '',
        selected: {
          id: '1',
          email: 'x@y.de',
          label: 'X',
          kind: 'external_contact',
        },
      })
    ).toBe(true)
    expect(canSubmitApprovalRecipient({ query: 'Max', selected: null })).toBe(false)
  })
})

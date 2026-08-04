import { describe, expect, it } from 'vitest'

import {
  quickChoiceGrantsApproval,
  quickChoiceToScope,
  scopeToQuickChoice,
} from './quick-approval-choice'

describe('quick-approval-choice', () => {
  it('maps change requests to changes_needed choice', () => {
    expect(
      scopeToQuickChoice(
        {
          approvalType: 'named',
          namentlichPublic: true,
          namentlichConfidential: true,
          referenceCallsEnabled: false,
          referenceCallFrequency: 'yearly',
        },
        { hasChangeRequest: true },
      ),
    ).toBe('changes_needed')
  })

  it('does not grant approval for changes_needed or none', () => {
    expect(quickChoiceGrantsApproval('named')).toBe(true)
    expect(quickChoiceGrantsApproval('anonymous')).toBe(true)
    expect(quickChoiceGrantsApproval('changes_needed')).toBe(false)
    expect(quickChoiceGrantsApproval('none')).toBe(false)
    expect(quickChoiceGrantsApproval(null)).toBe(false)
    expect(quickChoiceToScope('changes_needed', false)).toBeNull()
    expect(quickChoiceToScope(null, false)).toBeNull()
  })
})

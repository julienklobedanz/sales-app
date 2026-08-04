import { describe, expect, it } from 'vitest'

import { suggestApprovalQuote } from '@/lib/references/suggest-approval-quote'

describe('suggestApprovalQuote', () => {
  it('prefers proposed quote when present', () => {
    expect(
      suggestApprovalQuote({
        orgName: 'RefStack',
        proposedQuote: 'Bereits vorgeschlagen.',
      }),
    ).toBe('Bereits vorgeschlagen.')
  })

  it('builds a short quote with org name', () => {
    const quote = suggestApprovalQuote({
      orgName: 'RefStack Demo',
      ourSolution: 'Wir haben die Effizienz im Kerngeschäft deutlich gesteigert.',
    })
    expect(quote).toContain('RefStack Demo')
    expect(quote.length).toBeGreaterThan(30)
  })
})

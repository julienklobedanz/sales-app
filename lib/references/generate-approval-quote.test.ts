import { describe, expect, it } from 'vitest'

import { detectReferenceContentLanguage } from './generate-approval-quote'

describe('detectReferenceContentLanguage', () => {
  it('detects German reference content', () => {
    expect(
      detectReferenceContentLanguage(
        'Wir haben die Effizienz im Kerngeschäft deutlich gesteigert.',
        'Die Herausforderung lag in der Integration.',
      ),
    ).toBe('de')
  })

  it('detects English reference content', () => {
    expect(
      detectReferenceContentLanguage(
        'We delivered a scalable cloud platform for our customer.',
        'The project helped the team accelerate their digital transformation.',
      ),
    ).toBe('en')
  })
})

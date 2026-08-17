import { describe, expect, it } from 'vitest'

import { shouldLogReferenceViewed } from './reference-viewed'

describe('shouldLogReferenceViewed', () => {
  it('zählt Deeplink und Zeilenklick', () => {
    expect(
      shouldLogReferenceViewed({
        arrivedWithId: true,
        referenceId: 'a',
        firstSelectedId: 'a',
      }),
    ).toBe(true)
  })

  it('zählt Auto-Select der ersten Zeile nicht', () => {
    expect(
      shouldLogReferenceViewed({
        arrivedWithId: false,
        referenceId: 'a',
        firstSelectedId: 'a',
      }),
    ).toBe(false)
  })

  it('zählt den Wechsel nach Auto-Select', () => {
    expect(
      shouldLogReferenceViewed({
        arrivedWithId: false,
        referenceId: 'b',
        firstSelectedId: 'a',
      }),
    ).toBe(true)
  })

  it('zählt die Rückkehr zur ersten Zeile nach einem Wechsel', () => {
    expect(
      shouldLogReferenceViewed({
        arrivedWithId: false,
        referenceId: 'a',
        firstSelectedId: 'a',
        hasLeftInitialSelection: true,
      }),
    ).toBe(true)
  })
})

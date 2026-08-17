import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/lib/routes'
import { referencesReadHref } from './references-list-view'

describe('referencesReadHref', () => {
  it('leitet auf die Bibliothek mit Lesen und Auswahl', () => {
    expect(referencesReadHref('ref-1')).toBe(
      `${ROUTES.references.root}?view=lesen&id=ref-1`,
    )
  })

  it('reicht Extra-Parameter durch', () => {
    expect(referencesReadHref('ref-1', { startApproval: '1' })).toBe(
      `${ROUTES.references.root}?view=lesen&id=ref-1&startApproval=1`,
    )
  })
})

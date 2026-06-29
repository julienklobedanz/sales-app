import { describe, expect, it } from 'vitest'

import { validateDecisiveReferenceId } from './outcome-capture'

describe('validateDecisiveReferenceId', () => {
  it('erlaubt leere Angabe', () => {
    expect(validateDecisiveReferenceId(null, ['a'])).toEqual({ ok: true })
    expect(validateDecisiveReferenceId(undefined, [])).toEqual({ ok: true })
  })

  it('akzeptiert verknüpfte Referenz', () => {
    expect(validateDecisiveReferenceId('ref-1', ['ref-1', 'ref-2'])).toEqual({ ok: true })
  })

  it('lehnt nicht verknüpfte Referenz ab', () => {
    const result = validateDecisiveReferenceId('ref-3', ['ref-1'])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/verknüpft/)
    }
  })
})

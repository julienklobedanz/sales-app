import { describe, expect, it } from 'vitest'

import {
  buildCollectionObjectUrl,
  resolveCollectionObjectSelection,
} from './use-collection-object-selection'

describe('collection object selection', () => {
  it('patched die URL und löscht Keys bei null', () => {
    const params = new URLSearchParams('view=lesen&id=old')
    expect(buildCollectionObjectUrl('/accounts', params, { id: 'next' })).toBe(
      '/accounts?view=lesen&id=next',
    )
    expect(
      buildCollectionObjectUrl('/accounts', params, { id: null }),
    ).toBe('/accounts?view=lesen')
  })

  it('erkennt ungültige Auswahl und löst das Objekt auf', () => {
    const items = [{ id: 'a' }, { id: 'b' }]
    expect(resolveCollectionObjectSelection(items, 'b')).toEqual({
      selected: items[1],
      invalidId: false,
    })
    expect(resolveCollectionObjectSelection(items, 'missing')).toEqual({
      selected: null,
      invalidId: true,
    })
    expect(resolveCollectionObjectSelection([], 'missing')).toEqual({
      selected: null,
      invalidId: false,
    })
    expect(resolveCollectionObjectSelection(items, null)).toEqual({
      selected: null,
      invalidId: false,
    })
  })
})

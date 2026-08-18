import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { COLLECTION_TOOLBAR_SLOT_IDS } from '@/lib/dashboard/collection-toolbar-slots'

import { CollectionToolbar } from './collection-toolbar'

describe('CollectionToolbar', () => {
  it('lässt leere Slots stehen und rückt Positionen nicht nach', () => {
    const { container } = render(
      <CollectionToolbar
        slots={{
          'collection-search': <span>Suche</span>,
        }}
      />,
    )

    const slots = [...container.querySelectorAll('[data-slot]')]
    expect(slots.map((el) => el.getAttribute('data-slot'))).toEqual([
      ...COLLECTION_TOOLBAR_SLOT_IDS,
    ])

    const emptyView = container.querySelector('[data-slot="collection-view"]')
    expect(emptyView).not.toBeNull()
    expect(emptyView).toHaveAttribute('aria-hidden', 'true')
    expect(emptyView?.childElementCount).toBe(0)

    const search = container.querySelector('[data-slot="collection-search"]')
    expect(search).toHaveTextContent('Suche')
    expect(search).not.toHaveAttribute('aria-hidden')
  })
})

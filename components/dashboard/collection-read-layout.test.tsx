import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setIsMobile } from '@/tests/components/mock-use-is-mobile'

import { CollectionReadLayout } from './collection-read-layout'

describe('CollectionReadLayout', () => {
  beforeEach(() => {
    setIsMobile(false)
  })

  it('zeigt auf schmal mit Auswahl nur die Pane und ruft onBack', () => {
    setIsMobile(true)
    const onBack = vi.fn()

    render(
      <CollectionReadLayout
        list={<div>Listeninhalt</div>}
        pane={<div>Paneinhalt</div>}
        hasSelection
        onBack={onBack}
      />,
    )

    expect(screen.queryByText('Listeninhalt')).not.toBeInTheDocument()
    expect(screen.getByText('Paneinhalt')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Liste' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('zeigt auf schmal ohne Auswahl nur die Liste', () => {
    setIsMobile(true)

    render(
      <CollectionReadLayout
        list={<div>Listeninhalt</div>}
        pane={<div>Paneinhalt</div>}
        hasSelection={false}
      />,
    )

    expect(screen.getByText('Listeninhalt')).toBeInTheDocument()
    expect(screen.queryByText('Paneinhalt')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Zurück zur Liste' }),
    ).not.toBeInTheDocument()
  })

  it('zeigt auf breit mit Auswahl Liste und Pane', () => {
    render(
      <CollectionReadLayout
        list={<div>Listeninhalt</div>}
        pane={<div>Paneinhalt</div>}
        hasSelection
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('Listeninhalt')).toBeInTheDocument()
    expect(screen.getByText('Paneinhalt')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Zurück zur Liste' }),
    ).not.toBeInTheDocument()
  })
})

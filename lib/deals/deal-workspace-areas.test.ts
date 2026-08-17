import { describe, expect, it } from 'vitest'

import {
  DEAL_WORKSPACE_AREA_IDS,
  DEAL_WORKSPACE_DEFAULT_AREA,
  DEAL_WORKSPACE_ENTRY_AREAS,
  dealWorkspaceRailSlotFill,
  isDealWorkspaceArea,
  isDealWorkspaceEntryArea,
  type DealWorkspaceArea,
} from './deal-workspace-areas'

describe('deal workspace areas (§10.7)', () => {
  it('mappt sieben Bereiche in Konzept-Reihenfolge', () => {
    expect([...DEAL_WORKSPACE_AREA_IDS]).toEqual([
      'steckbrief',
      'dokumente',
      'stammdaten',
      'lose',
      'eignung',
      'risiken',
      'entwuerfe',
    ])
    expect(DEAL_WORKSPACE_DEFAULT_AREA).toBe('dokumente')
  })

  it('weist Urteil als Area auf Typebene ab', () => {
    expect(isDealWorkspaceArea('dokumente')).toBe(true)
    expect(isDealWorkspaceArea('urteil')).toBe(false)
    // @ts-expect-error — Urteil ist Deal-Seiten-Abschnitt, keine Workspace-Area
    const _urteil: DealWorkspaceArea = 'urteil'
    void _urteil
  })

  it('lässt das Count-Feld beim Collapse gefüllt', () => {
    expect(
      dealWorkspaceRailSlotFill({ narrow: true, hasCount: true }),
    ).toEqual({
      icon: 'filled',
      label: 'collapsed',
      count: 'filled',
    })
    expect(
      dealWorkspaceRailSlotFill({ narrow: false, hasCount: true }),
    ).toEqual({
      icon: 'filled',
      label: 'filled',
      count: 'filled',
    })
    expect(
      dealWorkspaceRailSlotFill({ narrow: true, hasCount: false }),
    ).toEqual({
      icon: 'filled',
      label: 'collapsed',
      count: 'empty',
    })
  })

  it('begrenzt Eintrag-Panel auf Risiken und Entwürfe', () => {
    expect([...DEAL_WORKSPACE_ENTRY_AREAS]).toEqual(['risiken', 'entwuerfe'])
    expect(isDealWorkspaceEntryArea('stammdaten')).toBe(false)
  })
})

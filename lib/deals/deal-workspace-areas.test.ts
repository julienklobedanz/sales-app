import { describe, expect, it } from 'vitest'

import {
  DEAL_ENTRY_PANEL_HOSTS,
  DEAL_WORKSPACE_AREA_IDS,
  DEAL_WORKSPACE_DEFAULT_AREA,
  DEAL_WORKSPACE_ENTRY_AREAS,
  DEAL_WORKSPACE_ENTRY_PARAM,
  dealWorkspaceLayoutChrome,
  dealWorkspaceRailSlotFill,
  dealWorkspaceSplitVisibility,
  isDealEntryPanelHost,
  isDealWorkspaceArea,
  isDealWorkspaceEntryArea,
  resolveDealWorkspaceView,
  shouldStripDealWorkspaceEntryQuery,
  type DealEntryPanelHost,
  type DealWorkspaceArea,
  type DealWorkspaceLayoutChrome,
  type DealWorkspaceView,
} from './deal-workspace-areas'

describe('deal workspace areas (§10.7)', () => {
  it('mappt sieben Bereiche in Konzept-Reihenfolge', () => {
    expect([...DEAL_WORKSPACE_AREA_IDS]).toEqual([
      'steckbrief',
      'dokumente',
      'stammdaten',
      'anforderungen',
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
    expect(dealWorkspaceRailSlotFill({ narrow: true, hasCount: true })).toEqual({
      icon: 'filled',
      label: 'collapsed',
      count: 'filled',
    })
    expect(dealWorkspaceRailSlotFill({ narrow: false, hasCount: true })).toEqual({
      icon: 'filled',
      label: 'filled',
      count: 'filled',
    })
    expect(dealWorkspaceRailSlotFill({ narrow: true, hasCount: false })).toEqual({
      icon: 'filled',
      label: 'collapsed',
      count: 'empty',
    })
  })

  it('begrenzt Eintrag-Panel auf Anforderungen, Risiken und Entwürfe', () => {
    expect([...DEAL_WORKSPACE_ENTRY_AREAS]).toEqual([
      'anforderungen',
      'risiken',
      'entwuerfe',
    ])
    expect(isDealWorkspaceEntryArea('stammdaten')).toBe(false)
    expect(DEAL_WORKSPACE_ENTRY_PARAM).toBe('eintrag')
  })

  it('weist Panel auf Stammdaten und fremde Hosts auf Typebene ab', () => {
    const content: DealWorkspaceView = { area: 'stammdaten', layer: 'content' }
    expect(content.layer).toBe('content')
    // @ts-expect-error — Panel nur auf Risiken und Entwürfe
    const _stammdatenPanel: DealWorkspaceView = {
      area: 'stammdaten',
      layer: 'entry-panel',
      entryId: 'x',
    }
    void _stammdatenPanel

    expect([...DEAL_ENTRY_PANEL_HOSTS]).toEqual(['workspace'])
    expect(isDealEntryPanelHost('workspace')).toBe(true)
    expect(isDealEntryPanelHost('sheet')).toBe(false)
    const host: DealEntryPanelHost = 'workspace'
    expect(host).toBe('workspace')
    // @ts-expect-error — Sheet ist kein Workspace-Panel-Host
    const _sheet: DealEntryPanelHost = 'sheet'
    // @ts-expect-error — Overlay über dem Panel ist kein Host
    const _over: DealEntryPanelHost = 'over-panel'
    void _sheet
    void _over

    const chrome = dealWorkspaceLayoutChrome({
      area: 'risiken',
      layer: 'entry-panel',
      entryId: 'rf:1',
    })
    expect(chrome.layer).toBe('entry-panel')
    const _floating: DealWorkspaceLayoutChrome = {
      layer: 'content',
      // @ts-expect-error — kein zweiter floating-Slot
      floating: 'sheet',
    }
    void _floating
    const _floatingLayer: DealWorkspaceView = {
      area: 'risiken',
      // @ts-expect-error — floating ist keine View-Ebene
      layer: 'floating',
      entryId: 'x',
    }
    void _floatingLayer
  })

  it('öffnet das Panel nur mit gültiger Entry-Area-Auswahl', () => {
    expect(resolveDealWorkspaceView('risiken', 'rf:1')).toEqual({
      area: 'risiken',
      layer: 'entry-panel',
      entryId: 'rf:1',
    })
    expect(resolveDealWorkspaceView('dokumente', 'rf:1')).toEqual({
      area: 'dokumente',
      layer: 'content',
    })
    expect(resolveDealWorkspaceView('entwuerfe', null)).toEqual({
      area: 'entwuerfe',
      layer: 'content',
    })
  })

  it('blendet die Liste schmal bei offenem Panel aus', () => {
    expect(
      dealWorkspaceSplitVisibility({ isMobile: false, layer: 'entry-panel' }),
    ).toEqual({ showList: true, showPanel: true })
    expect(
      dealWorkspaceSplitVisibility({ isMobile: true, layer: 'entry-panel' }),
    ).toEqual({ showList: false, showPanel: true })
    expect(dealWorkspaceSplitVisibility({ isMobile: true, layer: 'content' })).toEqual({
      showList: true,
      showPanel: false,
    })
  })

  it('strippt eintrag auf Non-Entry-Areas und leerer Liste', () => {
    expect(
      shouldStripDealWorkspaceEntryQuery({
        area: 'dokumente',
        selectedId: 'rf:1',
        entryCount: 0,
      }),
    ).toBe(true)
    expect(
      shouldStripDealWorkspaceEntryQuery({
        area: 'entwuerfe',
        selectedId: 'row-1',
        entryCount: 0,
      }),
    ).toBe(true)
    expect(
      shouldStripDealWorkspaceEntryQuery({
        area: 'risiken',
        selectedId: 'rf:missing',
        entryCount: 3,
      }),
    ).toBe(false)
    expect(
      shouldStripDealWorkspaceEntryQuery({
        area: 'risiken',
        selectedId: null,
        entryCount: 3,
      }),
    ).toBe(false)
  })
})

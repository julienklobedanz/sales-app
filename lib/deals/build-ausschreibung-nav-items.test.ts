import { describe, expect, it } from 'vitest'

import { DEAL_WORKSPACE_AREA_IDS } from './deal-workspace-areas'
import { dealWorkspaceAreaHref } from './deal-workspace-href'
import { buildAusschreibungNavItems } from './build-ausschreibung-nav-items'

const counts = {
  dealId: 'deal-1',
  documentCount: 3,
  stammdatenCount: 8,
  eligibilityCount: 12,
  risksCount: 4,
  draftsCovered: 1,
  draftsTotal: 26,
  lotsCount: 2,
}

describe('buildAusschreibungNavItems', () => {
  it('zeigt ohne Analyse nur Dokumente, mit Count', () => {
    const items = buildAusschreibungNavItems({
      ...counts,
      showAnalysisLinks: false,
    })
    expect(items.map((item) => item.id)).toEqual(['dokumente'])
    expect(items[0]?.count).toBe('3')
    expect(items[0]?.href).toBe(dealWorkspaceAreaHref('deal-1', 'dokumente'))
  })

  it('zeigt Dokumente bei 0 als Zahl, andere Bereiche nicht', () => {
    const items = buildAusschreibungNavItems({
      ...counts,
      documentCount: 0,
      stammdatenCount: 0,
      eligibilityCount: 0,
      risksCount: 0,
      draftsCovered: 0,
      draftsTotal: 0,
      lotsCount: 0,
      showAnalysisLinks: true,
    })
    expect(items.find((item) => item.id === 'dokumente')?.count).toBe('0')
    expect(items.find((item) => item.id === 'stammdaten')?.count).toBeNull()
    expect(items.find((item) => item.id === 'lose')?.count).toBeNull()
    expect(items.find((item) => item.id === 'eignung')?.count).toBeNull()
    expect(items.find((item) => item.id === 'risiken')?.count).toBeNull()
    expect(items.find((item) => item.id === 'entwuerfe')?.count).toBeNull()
  })

  it('legt die Leiste aus derselben Area-Union an — ohne Urteil', () => {
    const items = buildAusschreibungNavItems({
      ...counts,
      showAnalysisLinks: true,
    })
    expect(items.map((item) => item.id)).toEqual([...DEAL_WORKSPACE_AREA_IDS])
    expect(items.some((item) => (item.id as string) === 'urteil')).toBe(false)
    expect(items.find((item) => item.id === 'entwuerfe')?.count).toBe('1/26')
    expect(items.find((item) => item.id === 'dokumente')?.count).toBe('3')
  })
})

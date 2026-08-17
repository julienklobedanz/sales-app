import { describe, expect, it } from 'vitest'

import {
  DEAL_PAGE_SECTION_IDS,
  dealPageSectionFill,
  type DealPageSectionId,
} from './deal-page-sections'

describe('deal page sections (§10.2)', () => {
  it('mappt die sechs Abschnitte in fester Reihenfolge', () => {
    expect([...DEAL_PAGE_SECTION_IDS]).toEqual([
      'identity',
      'verdict',
      'deadlines',
      'proofs',
      'ausschreibung',
      'facts',
    ])
  })

  it('lässt das Urteil leer, solange nicht analysiert', () => {
    expect(
      dealPageSectionFill({ isRfpDeal: true, hasAnalysis: false }).verdict,
    ).toBe('empty')
    expect(
      dealPageSectionFill({ isRfpDeal: false, hasAnalysis: false }).verdict,
    ).toBe('empty')
  })

  it('füllt das Urteil nur bei RFP mit Analyse', () => {
    expect(
      dealPageSectionFill({ isRfpDeal: true, hasAnalysis: true }).verdict,
    ).toBe('filled')
  })

  it('weist Urteil als Arbeitsbereich-Area auf Typebene ab', () => {
    const section: DealPageSectionId = 'verdict'
    expect(section).toBe('verdict')
    // @ts-expect-error — Urteil ist Deal-Seiten-Abschnitt, keine Workspace-Area
    const _workspaceArea: DealPageSectionId = 'entwuerfe'
    void _workspaceArea
  })
})

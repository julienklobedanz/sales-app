import { describe, expect, it } from 'vitest'

import { reconcileDealRfpRequirements } from '@/lib/deals/reconcile-deal-rfp-requirements'

const aktiv = (id: string, normalizedText: string) =>
  ({ id, normalizedText, status: 'aktiv' as const })

const entfallen = (id: string, normalizedText: string) =>
  ({ id, normalizedText, status: 'entfallen' as const })

describe('reconcileDealRfpRequirements', () => {
  it('erkennt denselben Wortlaut trotz Groß/Klein und Bindestrich', () => {
    const plan = reconcileDealRfpRequirements(
      [aktiv('a', 'iso 27001 zertifikat')],
      [{ text: 'ISO-27001-Zertifikat' }],
    )
    expect(plan.keepIds).toEqual(['a'])
    expect(plan.insert).toEqual([])
    expect(plan.dropIds).toEqual([])
  })

  it('legt bei Umschreibung neu an und markiert die alte Zeile entfallen', () => {
    const plan = reconcileDealRfpRequirements(
      [aktiv('a', 'iso 27001 zertifikat')],
      [{ text: 'Nachweis eines Informationssicherheits-Managementsystems' }],
    )
    expect(plan.keepIds).toEqual([])
    expect(plan.dropIds).toEqual(['a'])
    expect(plan.insert).toEqual([
      {
        text: 'Nachweis eines Informationssicherheits-Managementsystems',
        normalizedText: 'nachweis eines informationssicherheits managementsystems',
        category: null,
      },
    ])
  })

  it('markiert fehlende Anforderungen als entfallen', () => {
    const plan = reconcileDealRfpRequirements(
      [aktiv('keep', 'hosting in der eu'), aktiv('gone', 'pen test jahrlich')],
      [{ text: 'Hosting in der EU' }],
    )
    expect(plan.keepIds).toEqual(['keep'])
    expect(plan.dropIds).toEqual(['gone'])
    expect(plan.insert).toEqual([])
  })

  it('markiert bei leerer Extraktion alle aktiven als entfallen', () => {
    const plan = reconcileDealRfpRequirements(
      [aktiv('a', 'iso 27001'), aktiv('b', 'soc 2')],
      [],
    )
    expect(plan.keepIds).toEqual([])
    expect(plan.insert).toEqual([])
    expect(plan.dropIds).toEqual(['a', 'b'])
  })

  it('aktiviert eine zuvor entfallene Zeile wieder, wenn der Text zurückkommt', () => {
    const plan = reconcileDealRfpRequirements(
      [entfallen('a', 'iso 27001')],
      [{ text: 'ISO 27001' }],
    )
    expect(plan.keepIds).toEqual(['a'])
    expect(plan.dropIds).toEqual([])
    expect(plan.insert).toEqual([])
  })
})

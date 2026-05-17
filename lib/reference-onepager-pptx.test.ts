import { describe, expect, it } from 'vitest'
import {
  estimateBodyHeightInches,
  normalizePptxFlowText,
  pickOnepagerBodyFontPt,
} from './reference-onepager-pptx'

describe('reference-onepager-pptx', () => {
  it('normalizePptxFlowText merges continuation lines but keeps bullets', () => {
    const raw = 'Line one\ncontinued thought\n• Bullet A\n• Bullet B'
    expect(normalizePptxFlowText(raw)).toBe('Line one continued thought\n• Bullet A\n• Bullet B')
  })

  it('pickOnepagerBodyFontPt returns preferred size for short copy', () => {
    const pt = pickOnepagerBodyFontPt({
      summary: 'Kurze Zusammenfassung.',
      projektDetails: 'Volumen: 1 Mio',
      challenge: '• Punkt eins',
      solution: 'Kurze Lösung.',
      leftW: 4.35,
      rightW: 4.55,
      maxRow1Body: 1.2,
      row1BodyY: 2,
      contentBottomY: 5.1,
      gapBetweenSections: 0.14,
      sectionLabelH: 0.22,
      gapAfterSectionTitle: 0.04,
      minRow2Body: 0.22,
    })
    expect(pt).toBeGreaterThanOrEqual(5.5)
    expect(pt).toBeLessThanOrEqual(10)
  })

  it('long solution text picks a font size below preferred', () => {
    const longSolution =
      'A cornerstone of this approach is a comprehensive modernization program spanning network core, edge, and operations. '.repeat(
        6
      )
    const pt = pickOnepagerBodyFontPt({
      summary: 'Summary text for the reference.',
      projektDetails: 'Volumen: 20000000\nVertragsart: Festpreis',
      challenge: '• Challenge one\n• Challenge two\n• Challenge three',
      solution: longSolution,
      leftW: 4.35,
      rightW: 4.55,
      maxRow1Body: 0.9,
      row1BodyY: 1.85,
      contentBottomY: 5.125,
      gapBetweenSections: 0.14,
      sectionLabelH: 0.22,
      gapAfterSectionTitle: 0.04,
      minRow2Body: 0.22,
    })
    expect(pt).toBeGreaterThanOrEqual(5)
    expect(pt).toBeLessThanOrEqual(10)
    expect(longSolution.includes('…')).toBe(false)
  })
})

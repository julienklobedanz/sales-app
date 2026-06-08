import { describe, expect, it } from 'vitest'
import {
  clipExecutiveSummary,
  clipPptxBullet,
  estimateBulletBlockHeight,
  extractChallengeBulletsForPptx,
  extractSolutionBulletsForPptx,
  normalizePptxFlowText,
  resolveStatusPill,
} from './reference-onepager-pptx'

describe('reference-onepager-pptx', () => {
  it('normalizePptxFlowText merges continuation lines but keeps bullets', () => {
    const raw = 'Line one\ncontinued thought\n• Bullet A\n• Bullet B'
    expect(normalizePptxFlowText(raw)).toBe('Line one continued thought\n• Bullet A\n• Bullet B')
  })

  it('extractChallengeBulletsForPptx keeps at most five bullets', () => {
    const bullets = extractChallengeBulletsForPptx(
      '• One\n• Two\n• Three\n• Four\n• Five\n• Six should drop'
    )
    expect(bullets).toHaveLength(5)
  })

  it('extractSolutionBulletsForPptx splits prose into five short sentence bullets', () => {
    const prose =
      'First sentence about scale. Second sentence about logistics. Third sentence about modernization. Fourth sentence about vendors. Fifth sentence about rollout. Sixth sentence should be ignored.'
    const bullets = extractSolutionBulletsForPptx(prose)
    expect(bullets).toHaveLength(5)
    expect(bullets[0]).toContain('First sentence')
    expect(bullets[4]).not.toContain('Sixth')
  })

  it('clipPptxBullet enforces 85 character limit with ellipsis', () => {
    const clipped = clipPptxBullet('A'.repeat(120), 85)
    expect(clipped.length).toBeLessThanOrEqual(85)
    expect(clipped.endsWith('...')).toBe(true)
  })

  it('clipExecutiveSummary limits to roughly two lines', () => {
    const long =
      'Modernizing network infrastructure and operations to meet rising data demands, while unlocking measurable gains in energy efficiency across the entire enterprise footprint and vendor ecosystem.'
    const clipped = clipExecutiveSummary(long, 120)
    expect(clipped.endsWith('…')).toBe(true)
    expect(clipped.length).toBeLessThanOrEqual(121)
  })

  it('resolveStatusPill uses green styling for completed projects', () => {
    const pill = resolveStatusPill('approved', 'completed')
    expect(pill.label).toBe('Abgeschlossen')
    expect(pill.fill).toBe('ECFDF5')
  })

  it('resolveStatusPill falls back to reference status label', () => {
    const pill = resolveStatusPill('draft', null)
    expect(pill.label).toBe('Entwurf')
    expect(pill.text).toBe('475569')
  })

  it('estimateBulletBlockHeight grows with more wrapped bullets', () => {
    const short = estimateBulletBlockHeight(['Kurz.'], 5.5)
    const long = estimateBulletBlockHeight(
      ['Ein deutlich längerer Bulletpoint der über mehrere Zeilen umbrechen sollte.', 'Noch einer.'],
      5.5
    )
    expect(long).toBeGreaterThan(short)
  })
})

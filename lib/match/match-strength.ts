export type MatchStrengthTier = 'excellent' | 'good' | 'moderate' | 'low'

export type MatchStrengthDisplay = {
  tier: MatchStrengthTier
  labelShort: string
  ariaLabel: string
}

const BANDS: Array<{
  min: number
  tier: MatchStrengthTier
  labelShort: string
  ariaLabel: string
}> = [
  { min: 0.65, tier: 'excellent', labelShort: 'Sehr hoch', ariaLabel: 'Sehr hohe Relevanz' },
  { min: 0.55, tier: 'good', labelShort: 'Hoch', ariaLabel: 'Hohe Relevanz' },
  { min: 0.42, tier: 'moderate', labelShort: 'Gut', ariaLabel: 'Gute Relevanz' },
]

const LOW_BAND: MatchStrengthDisplay = {
  tier: 'low',
  labelShort: 'Mittel',
  ariaLabel: 'Mittlere Relevanz',
}

const TIER_ORDER: MatchStrengthTier[] = ['low', 'moderate', 'good', 'excellent']

function bandForSimilarity(similarity01: number): MatchStrengthDisplay {
  const sim = Math.min(1, Math.max(0, similarity01))
  for (const band of BANDS) {
    if (sim >= band.min) {
      return {
        tier: band.tier,
        labelShort: band.labelShort,
        ariaLabel: band.ariaLabel,
      }
    }
  }
  return LOW_BAND
}

function bumpTier(strength: MatchStrengthDisplay): MatchStrengthDisplay {
  const idx = TIER_ORDER.indexOf(strength.tier)
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return strength
  const nextTier = TIER_ORDER[idx + 1]!
  const nextBand = BANDS.find((b) => b.tier === nextTier)
  if (!nextBand) return strength
  return {
    tier: nextBand.tier,
    labelShort: nextBand.labelShort,
    ariaLabel: nextBand.ariaLabel,
  }
}

/**
 * Match-Stärke für UI (Label im Kreis). Basiert auf Roh-Cosine-Similarity;
 * optional eine Stufe hoch für Top-1 bei großem Abstand zum nächsten Treffer.
 * Negativ / NaN = Browse-Übersicht ohne Score.
 */
export function getMatchStrength(
  similarity01: number,
  options?: { rank?: number; gapToNext?: number | null }
): MatchStrengthDisplay {
  if (!Number.isFinite(similarity01) || similarity01 < 0) {
    return {
      tier: 'low',
      labelShort: '—',
      ariaLabel: 'Übersicht ohne Relevanz-Score',
    }
  }

  let strength = bandForSimilarity(similarity01)

  const rank = options?.rank ?? 1
  const gap = options?.gapToNext
  if (rank === 1 && gap != null && gap >= 0.12 && strength.tier !== 'excellent') {
    strength = bumpTier(strength)
  }

  return strength
}

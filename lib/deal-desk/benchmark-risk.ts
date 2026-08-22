import { statusToneFill, statusToneText } from '@/lib/ui/status-tone'

export type BenchmarkRiskCriterionId =
  | 'no_contact_rule'
  | 'incumbent_spec_sheet'
  | 'aggressive_deadline'
  | 'extreme_price_focus'
  | 'price_matrix_vs_content'
  | 'budgetary_quote_only'
  | 'unconditional_terms'
  | 'recycled_old_document'

export type BenchmarkRiskClass = 'ko' | 'strong' | 'weak'

export type BenchmarkRiskCriterionDef = {
  id: BenchmarkRiskCriterionId
  class: BenchmarkRiskClass
  weight: number
  tooltipLabel: string
  tooltipClassLabel: string
}

export const BENCHMARK_RISK_CRITERIA: Record<
  BenchmarkRiskCriterionId,
  BenchmarkRiskCriterionDef
> = {
  no_contact_rule: {
    id: 'no_contact_rule',
    class: 'ko',
    weight: 30,
    tooltipClassLabel: 'KO-Kriterium',
    tooltipLabel: 'Kein Zugang zu Fachexperten erlaubt',
  },
  incumbent_spec_sheet: {
    id: 'incumbent_spec_sheet',
    class: 'ko',
    weight: 30,
    tooltipClassLabel: 'KO-Kriterium',
    tooltipLabel: 'Lastenheft spiegelt Incumbent-Produkte',
  },
  aggressive_deadline: {
    id: 'aggressive_deadline',
    class: 'strong',
    weight: 20,
    tooltipClassLabel: 'Starker Indikator',
    tooltipLabel: 'Frist ungewöhnlich kurz für Projektvolumen',
  },
  extreme_price_focus: {
    id: 'extreme_price_focus',
    class: 'strong',
    weight: 20,
    tooltipClassLabel: 'Starker Indikator',
    tooltipLabel: 'Preisanteil dominiert Vergabekriterien',
  },
  price_matrix_vs_content: {
    id: 'price_matrix_vs_content',
    class: 'strong',
    weight: 20,
    tooltipClassLabel: 'Starker Indikator',
    tooltipLabel: 'Detaillierte Preismatrix bei vagen Anforderungen',
  },
  budgetary_quote_only: {
    id: 'budgetary_quote_only',
    class: 'weak',
    weight: 10,
    tooltipClassLabel: 'Schwacher Indikator',
    tooltipLabel: 'Forderung nach unverbindlichen Richtpreisen',
  },
  unconditional_terms: {
    id: 'unconditional_terms',
    class: 'weak',
    weight: 10,
    tooltipClassLabel: 'Schwacher Indikator',
    tooltipLabel: 'Keine Abweichung von Einkaufsbedingungen',
  },
  recycled_old_document: {
    id: 'recycled_old_document',
    class: 'weak',
    weight: 10,
    tooltipClassLabel: 'Schwacher Indikator',
    tooltipLabel: 'Veraltete Jahreszahlen/Deadlines im Dokument',
  },
}

export const BENCHMARK_RISK_CRITERION_IDS = Object.keys(
  BENCHMARK_RISK_CRITERIA,
) as BenchmarkRiskCriterionId[]

export type BenchmarkRiskHit = {
  id: BenchmarkRiskCriterionId
  evidence?: string | null
}

export type BenchmarkRiskAnalysis = {
  scorePercent: number
  hits: BenchmarkRiskHit[]
}

export function isBenchmarkRiskCriterionId(
  value: string,
): value is BenchmarkRiskCriterionId {
  return value in BENCHMARK_RISK_CRITERIA
}

export function computeBenchmarkRiskScore(hits: BenchmarkRiskHit[]): number {
  const seen = new Set<BenchmarkRiskCriterionId>()
  let sum = 0
  for (const hit of hits) {
    if (!isBenchmarkRiskCriterionId(hit.id) || seen.has(hit.id)) continue
    seen.add(hit.id)
    sum += BENCHMARK_RISK_CRITERIA[hit.id].weight
  }
  return Math.min(100, sum)
}

export function buildBenchmarkRiskAnalysis(
  hits: BenchmarkRiskHit[],
): BenchmarkRiskAnalysis {
  const normalized = hits.filter((h) => isBenchmarkRiskCriterionId(h.id))
  return {
    hits: normalized,
    scorePercent: computeBenchmarkRiskScore(normalized),
  }
}

export type BenchmarkRiskTone = 'low' | 'medium' | 'high'

export function benchmarkRiskTone(scorePercent: number): BenchmarkRiskTone {
  if (scorePercent >= 60) return 'high'
  if (scorePercent >= 30) return 'medium'
  return 'low'
}

export function benchmarkRiskValueClass(tone: BenchmarkRiskTone): string {
  if (tone === 'high') return statusToneText.danger
  if (tone === 'medium') return statusToneText.warning
  return statusToneText.success
}

/** Badge-Stil analog „Empfehlung: Go“ — Vollton über statusToneFill. */
export function benchmarkRiskBadgeClass(tone: BenchmarkRiskTone): string {
  if (tone === 'high') return statusToneFill.danger
  if (tone === 'medium') return statusToneFill.warning
  return statusToneFill.success
}

export function topBenchmarkRiskTooltipHits(
  hits: BenchmarkRiskHit[],
  limit = 5,
): BenchmarkRiskHit[] {
  const unique = new Map<BenchmarkRiskCriterionId, BenchmarkRiskHit>()
  for (const hit of hits) {
    if (!isBenchmarkRiskCriterionId(hit.id)) continue
    if (!unique.has(hit.id)) unique.set(hit.id, hit)
  }
  return [...unique.values()]
    .sort(
      (a, b) =>
        BENCHMARK_RISK_CRITERIA[b.id].weight - BENCHMARK_RISK_CRITERIA[a.id].weight,
    )
    .slice(0, limit)
}

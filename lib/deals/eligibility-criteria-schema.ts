type EligibilityDimension =
  | 'employee_count'
  | 'annual_revenue'
  | 'reference_count'
  | 'certification'
  | 'region'
  | 'other'

type EligibilityOperator = 'gte' | 'lte' | 'eq' | 'contains'

export type EligibilityConfidence = 'high' | 'medium' | 'low'

export type EligibilityCriterion = {
  id: string
  dimension: EligibilityDimension
  label: string
  operator: EligibilityOperator
  /** Numeric threshold or text token (certification name, region). */
  value: number | string
  unit?: string
  mandatory: boolean
  confidence: EligibilityConfidence
  evidence?: string | null
}

export type EligibilityCompareStatus = 'met' | 'not_met' | 'unknown' | 'partial'

export type EligibilityCriterionResult = EligibilityCriterion & {
  status: EligibilityCompareStatus
  detail: string
}

export type EligibilityVerdict = 'eligible' | 'ko' | 'partner_required' | 'unknown'

export type EligibilityAssessment = {
  criteria: EligibilityCriterionResult[]
  verdict: EligibilityVerdict
  summary: string
}

const DIMENSIONS: EligibilityDimension[] = [
  'employee_count',
  'annual_revenue',
  'reference_count',
  'certification',
  'region',
  'other',
]

const OPERATORS: EligibilityOperator[] = ['gte', 'lte', 'eq', 'contains']

const CONFIDENCE: EligibilityConfidence[] = ['high', 'medium', 'low']

function slugId(label: string, index: number): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return base ? `${base}-${index}` : `criterion-${index}`
}

function parseEligibilityCriterion(
  raw: unknown,
  index: number,
): EligibilityCriterion | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  const dimension = typeof o.dimension === 'string' ? o.dimension.trim() : ''
  if (!DIMENSIONS.includes(dimension as EligibilityDimension)) return null

  const label = typeof o.label === 'string' ? o.label.trim() : ''
  if (!label) return null

  const operator = typeof o.operator === 'string' ? o.operator.trim() : 'gte'
  if (!OPERATORS.includes(operator as EligibilityOperator)) return null

  let value: number | string | null = null
  if (typeof o.value === 'number' && Number.isFinite(o.value)) {
    value = o.value
  } else if (typeof o.value === 'string' && o.value.trim()) {
    value = o.value.trim()
  }
  if (value === null) return null

  const confidenceRaw = typeof o.confidence === 'string' ? o.confidence.trim() : 'medium'
  const confidence = CONFIDENCE.includes(confidenceRaw as EligibilityConfidence)
    ? (confidenceRaw as EligibilityConfidence)
    : 'medium'

  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : slugId(label, index)

  return {
    id,
    dimension: dimension as EligibilityDimension,
    label,
    operator: operator as EligibilityOperator,
    value,
    unit: typeof o.unit === 'string' && o.unit.trim() ? o.unit.trim() : undefined,
    mandatory: o.mandatory !== false,
    confidence,
    evidence:
      typeof o.evidence === 'string' && o.evidence.trim() ? o.evidence.trim() : null,
  }
}

export function parseEligibilityCriteriaResponse(raw: unknown): EligibilityCriterion[] {
  if (!raw || typeof raw !== 'object') return []
  const obj = raw as { criteria?: unknown }
  if (!Array.isArray(obj.criteria)) return []

  const out: EligibilityCriterion[] = []
  for (let i = 0; i < obj.criteria.length; i++) {
    const parsed = parseEligibilityCriterion(obj.criteria[i], i)
    if (parsed) out.push(parsed)
  }
  return out.slice(0, 20)
}

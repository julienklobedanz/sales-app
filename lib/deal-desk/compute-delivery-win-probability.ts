import type { DealDeskRedFlag } from '@/lib/deal-desk/deal-analysis-types'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'
import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'
import type { RfpVerdict } from '@/lib/rfp-relevance'
import {
  effectiveSimilarity,
  isRequirementCovered,
} from '@/lib/deals/rfp-relevance-coverage'
import { MATCH_COVERAGE_THRESHOLD } from '@/lib/match/match-thresholds'

export type OrgComplianceDoc = {
  document_type: string
  title: string
  valid_until: string | null
  file_storage_path: string | null
}

export type WinProbabilityBreakdown = {
  /** Referenz-/Portfolio-Abdeckung fachlicher Anforderungen (0–100) */
  portfolioScore: number
  /** Tiefe der Referenz-Matches / lieferbare Capabilities (0–100) */
  capabilityScore: number
  /** Abgedeckte Compliance-Nachweise vs. RFP-Pflichten (0–100) */
  evidenceScore: number
  /** Abzug durch Vertrags-/SLA-Red-Flags (0–30) */
  contractPenalty: number
  /** Gewichteter Score vor Abzug */
  weightedScore: number
  finalScore: number
  matchedReferences: number
  totalDeliveryRequirements: number
  fulfilledComplianceRequirements: number
  totalComplianceRequirements: number
}

const WEIGHTS = {
  portfolio: 0.4,
  capability: 0.35,
  evidence: 0.25,
} as const

const MAX_CONTRACT_PENALTY = 30

/** Muster: RFP-Pflicht → erwartete Dokumenttypen in Evidence Library */
const REQUIREMENT_DOC_PATTERNS: { pattern: RegExp; types: string[] }[] = [
  { pattern: /iso\s*27001/i, types: ['iso_27001'] },
  { pattern: /iso\s*9001/i, types: ['iso_9001'] },
  { pattern: /iso\s*14001/i, types: ['iso_14001'] },
  { pattern: /iso\s*22301/i, types: ['iso_22301'] },
  { pattern: /tisax/i, types: ['tisax'] },
  { pattern: /soc\s*2\s*type\s*ii|soc\s*2\s*ii/i, types: ['soc_2_type_ii', 'soc_2'] },
  { pattern: /soc\s*2/i, types: ['soc_2_type_i', 'soc_2_type_ii', 'soc_2'] },
  { pattern: /bsi\s*c5|c5[\s-]?testat/i, types: ['bsi_c5_testat', 'bsi_c5'] },
  { pattern: /penetration|pen[\s-]?test/i, types: ['pen_test'] },
  { pattern: /gdpr|ds[\s-]?gvo|datenschutz.*grundverordnung/i, types: ['gdpr_dpa'] },
  { pattern: /\bavv\b|\bdpa\b|auftragsverarbeitung/i, types: ['gdpr_dpa'] },
  { pattern: /haftpflicht|versicherungsnachweis/i, types: ['haftpflichtversicherung'] },
  { pattern: /rechenzentrum|data\s*cent(er|re)/i, types: ['rechenzentrum_zertifikat'] },
  { pattern: /code\s*of\s*conduct/i, types: ['code_of_conduct'] },
  { pattern: /nachhaltigkeit|sustainab/i, types: ['nachhaltigkeitszertifikat'] },
]

const COMPLIANCE_TEXT_PATTERN =
  /iso\s*\d|soc\s*2|tisax|bsi|c5|gdpr|ds[\s-]?gvo|\bavv\b|\bdpa\b|penetration|pen[\s-]?test|zertifikat|compliance|datenschutz|nachweis|zertifiziert|audit|informationssicherheit/i

export function isComplianceRequirement(
  req: Pick<ExtractedRfpRequirement, 'text' | 'category'>,
): boolean {
  const cat = (req.category ?? '').toLowerCase()
  if (
    /compliance|security|zertifikat|datenschutz|iso|audit|legal|governance/i.test(cat)
  ) {
    return true
  }
  return COMPLIANCE_TEXT_PATTERN.test(req.text)
}

function isDocValid(doc: OrgComplianceDoc, refDate: Date): boolean {
  if (!doc.file_storage_path?.trim()) return false
  if (!doc.valid_until) return true
  const end = new Date(`${doc.valid_until.slice(0, 10)}T12:00:00`)
  end.setHours(0, 0, 0, 0)
  const today = new Date(refDate)
  today.setHours(0, 0, 0, 0)
  return end.getTime() >= today.getTime()
}

function orgHasDocTypes(
  docs: OrgComplianceDoc[],
  types: string[],
  refDate: Date,
): boolean {
  const typeSet = new Set(types)
  return docs.some((d) => typeSet.has(d.document_type) && isDocValid(d, refDate))
}

function orgHasAnyComplianceEvidence(docs: OrgComplianceDoc[], refDate: Date): boolean {
  return docs.some((d) => isDocValid(d, refDate))
}

function requirementDocTypes(text: string): string[] | null {
  const types = new Set<string>()
  for (const { pattern, types: docTypes } of REQUIREMENT_DOC_PATTERNS) {
    if (pattern.test(text)) {
      for (const t of docTypes) types.add(t)
    }
  }
  return types.size > 0 ? [...types] : null
}

export function isComplianceRequirementFulfilled(
  req: Pick<ExtractedRfpRequirement, 'text'>,
  docs: OrgComplianceDoc[],
  refDate: Date = new Date(),
): boolean {
  const specific = requirementDocTypes(req.text)
  if (specific?.length) {
    return orgHasDocTypes(docs, specific, refDate)
  }
  return orgHasAnyComplianceEvidence(docs, refDate)
}

function bestSimilarity(
  coverage: RfpCoverageRow[],
  requirementId: string,
  verdicts?: Record<string, RfpVerdict> | null,
): number {
  const row = coverage.find((c) => c.requirementId === requirementId)
  if (!row || row.embedError) return 0
  return effectiveSimilarity(row, verdicts)
}

function computeContractPenalty(redFlags: DealDeskRedFlag[]): number {
  let penalty = 0
  for (const flag of redFlags) {
    if (flag.severity === 'critical') penalty += 10
    else if (flag.severity === 'high') penalty += 5
    else if (flag.severity === 'medium') penalty += 2
  }
  return Math.min(MAX_CONTRACT_PENALTY, penalty)
}

/**
 * Win Probability = Lieferfähigkeit aus Portfolio (Referenzen) + Capabilities (Match-Tiefe)
 * + Nachweise (Compliance-Dokumente) − Vertragsrisiko (Red Flags).
 * Keine KI-Schätzung.
 */
export function computeDeliveryWinProbability(params: {
  requirements: ExtractedRfpRequirement[]
  coverage: RfpCoverageRow[]
  complianceDocs: OrgComplianceDoc[]
  redFlags: DealDeskRedFlag[]
  matchThreshold?: number
  refDate?: Date
  rfpVerdicts?: Record<string, RfpVerdict> | null
}): WinProbabilityBreakdown {
  const {
    requirements,
    coverage,
    complianceDocs,
    redFlags,
    matchThreshold = MATCH_COVERAGE_THRESHOLD,
    refDate = new Date(),
    rfpVerdicts,
  } = params

  const deliveryReqs = requirements.filter((r) => !isComplianceRequirement(r))
  const complianceReqs = requirements.filter((r) => isComplianceRequirement(r))

  const deliveryPool = deliveryReqs.length > 0 ? deliveryReqs : requirements
  const useAllForDelivery = deliveryReqs.length === 0 && requirements.length > 0

  let matchedReferences = 0
  let similaritySum = 0

  for (const req of deliveryPool) {
    const row = coverage.find((c) => c.requirementId === req.id)
    const sim = bestSimilarity(coverage, req.id, rfpVerdicts)
    similaritySum += sim
    if (row && isRequirementCovered(row, rfpVerdicts, matchThreshold)) {
      matchedReferences += 1
    }
  }

  const totalDeliveryRequirements = deliveryPool.length
  const portfolioScore =
    totalDeliveryRequirements === 0
      ? complianceDocs.some((d) => isDocValid(d, refDate))
        ? 55
        : 40
      : Math.round((matchedReferences / totalDeliveryRequirements) * 100)

  const capabilityScore =
    totalDeliveryRequirements === 0
      ? portfolioScore
      : Math.round((similaritySum / totalDeliveryRequirements) * 100)

  let fulfilledComplianceRequirements = 0
  for (const req of complianceReqs) {
    if (isComplianceRequirementFulfilled(req, complianceDocs, refDate)) {
      fulfilledComplianceRequirements += 1
    }
  }

  const totalComplianceRequirements = complianceReqs.length
  let evidenceScore: number
  if (totalComplianceRequirements === 0) {
    evidenceScore = orgHasAnyComplianceEvidence(complianceDocs, refDate) ? 85 : 50
  } else {
    evidenceScore = Math.round(
      (fulfilledComplianceRequirements / totalComplianceRequirements) * 100,
    )
  }

  const contractPenalty = computeContractPenalty(redFlags)
  const weightedScore = Math.round(
    portfolioScore * WEIGHTS.portfolio +
      capabilityScore * WEIGHTS.capability +
      evidenceScore * WEIGHTS.evidence,
  )
  const finalScore = Math.min(100, Math.max(0, weightedScore - contractPenalty))

  return {
    portfolioScore,
    capabilityScore,
    evidenceScore,
    contractPenalty,
    weightedScore,
    finalScore,
    matchedReferences,
    totalDeliveryRequirements: useAllForDelivery
      ? requirements.length
      : totalDeliveryRequirements,
    fulfilledComplianceRequirements,
    totalComplianceRequirements,
  }
}

export function formatWinProbabilityBreakdownSummary(b: WinProbabilityBreakdown): string {
  return [
    `Portfolio (Referenzen): ${b.portfolioScore}%`,
    `Capabilities (Match-Tiefe): ${b.capabilityScore}%`,
    `Nachweise (Compliance): ${b.evidenceScore}%`,
    b.contractPenalty > 0 ? `Vertragsrisiko: −${b.contractPenalty} Pkt.` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

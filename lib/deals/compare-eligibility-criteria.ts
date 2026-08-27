import type { OrgComplianceDoc } from '@/lib/deal-desk/compute-delivery-win-probability'
import { normalizeToken } from '@/lib/deals/normalize-token'
import type { CapabilityProfile } from '@/lib/organizations/capability-profile-types'

import type {
  EligibilityAssessment,
  EligibilityCompareBasis,
  EligibilityCompareStatus,
  EligibilityConfidence,
  EligibilityCriterion,
  EligibilityCriterionResult,
  EligibilityVerdict,
} from './eligibility-criteria-schema'

export type EligibilityCompareContext = {
  profile: CapabilityProfile
  complianceDocs: OrgComplianceDoc[]
  referenceCount: number
  linkedCriterionIds?: ReadonlySet<string>
  absenceConfirmedIds?: ReadonlySet<string>
}

export function isCapabilityProfileEmpty(profile: CapabilityProfile): boolean {
  const hasEmployees =
    typeof profile.employeeCount === 'number' && profile.employeeCount > 0
  const hasRevenue =
    typeof profile.annualRevenueEur === 'number' && profile.annualRevenueEur > 0
  const hasRegions = Boolean(profile.regions?.length)
  const hasRoles = Boolean(profile.certifiedRoles?.length)
  return !hasEmployees && !hasRevenue && !hasRegions && !hasRoles
}

function fuzzyContains(haystack: string, needle: string): boolean {
  const h = normalizeToken(haystack)
  const n = normalizeToken(needle)
  if (!n) return false
  return (
    h.includes(n) || n.split(' ').every((part) => part.length >= 3 && h.includes(part))
  )
}

function compareNumeric(
  actual: number | undefined,
  operator: EligibilityCriterion['operator'],
  expected: number,
): EligibilityCompareStatus {
  if (actual === undefined || !Number.isFinite(actual)) return 'unknown'
  if (operator === 'gte') return actual >= expected ? 'met' : 'not_met'
  if (operator === 'lte') return actual <= expected ? 'met' : 'not_met'
  if (operator === 'eq') return actual === expected ? 'met' : 'not_met'
  return 'unknown'
}

function countCertifiedRole(profile: CapabilityProfile, roleNeedle: string): number {
  const roles = profile.certifiedRoles ?? []
  const needle = normalizeToken(roleNeedle)
  let total = 0
  for (const entry of roles) {
    const roleNorm = normalizeToken(entry.role)
    if (roleNorm.includes(needle) || needle.includes(roleNorm)) {
      total += Math.max(0, entry.count)
    }
  }
  return total
}

function countMatchingComplianceDocs(docs: OrgComplianceDoc[], token: string): number {
  let n = 0
  for (const doc of docs) {
    const blob = `${doc.document_type} ${doc.title}`
    if (fuzzyContains(blob, token)) n += 1
  }
  return n
}

function result(
  criterion: EligibilityCriterion,
  fields: {
    status: EligibilityCompareStatus
    detail: string
    basis: EligibilityCompareBasis
  },
): EligibilityCriterionResult {
  return { ...criterion, ...fields }
}

function compareCriterion(
  criterion: EligibilityCriterion,
  ctx: EligibilityCompareContext,
): EligibilityCriterionResult {
  const { profile, complianceDocs, referenceCount } = ctx

  switch (criterion.dimension) {
    case 'employee_count': {
      if (profile.employeeCount === undefined) {
        return result(criterion, {
          status: 'unknown',
          basis: 'numeric',
          detail: 'Mitarbeiterzahl im Profil fehlt — kein automatisches K.O.',
        })
      }
      const expected =
        typeof criterion.value === 'number' ? criterion.value : Number(criterion.value)
      if (!Number.isFinite(expected)) {
        return result(criterion, {
          status: 'unknown',
          basis: 'numeric',
          detail: 'Schwellenwert nicht interpretierbar.',
        })
      }
      const status = compareNumeric(profile.employeeCount, criterion.operator, expected)
      const actual = profile.employeeCount
      return result(criterion, {
        status,
        basis: 'numeric',
        detail: `${actual} MA vs. gefordert ${criterion.operator === 'gte' ? '≥' : criterion.operator === 'lte' ? '≤' : ''} ${expected}`,
      })
    }
    case 'annual_revenue': {
      if (profile.annualRevenueEur === undefined) {
        return result(criterion, {
          status: 'unknown',
          basis: 'numeric',
          detail: 'Umsatz im Profil fehlt — kein automatisches K.O.',
        })
      }
      const expected =
        typeof criterion.value === 'number' ? criterion.value : Number(criterion.value)
      if (!Number.isFinite(expected)) {
        return result(criterion, {
          status: 'unknown',
          basis: 'numeric',
          detail: 'Schwellenwert nicht interpretierbar.',
        })
      }
      const status = compareNumeric(
        profile.annualRevenueEur,
        criterion.operator,
        expected,
      )
      const actualMio =
        profile.annualRevenueEur != null
          ? `${Math.round(profile.annualRevenueEur / 1_000_000)} Mio €`
          : '—'
      const expectedMio = `${Math.round(expected / 1_000_000)} Mio €`
      return result(criterion, {
        status,
        basis: 'numeric',
        detail: `${actualMio} vs. gefordert ≥ ${expectedMio}`,
      })
    }
    case 'reference_count': {
      const expected =
        typeof criterion.value === 'number' ? criterion.value : Number(criterion.value)
      if (!Number.isFinite(expected)) {
        return result(criterion, {
          status: 'unknown',
          basis: 'numeric',
          detail: 'Schwellenwert nicht interpretierbar.',
        })
      }
      const status = compareNumeric(referenceCount, criterion.operator, expected)
      return result(criterion, {
        status,
        basis: 'numeric',
        detail:
          status === 'unknown'
            ? 'Referenzbestand nicht verfügbar.'
            : `${referenceCount} Referenzen vs. gefordert ≥ ${expected}`,
      })
    }
    case 'certification': {
      if (ctx.linkedCriterionIds?.has(criterion.id)) {
        return result(criterion, {
          status: 'met',
          basis: 'linked',
          detail: 'Verknüpfter Nachweis vorhanden',
        })
      }
      if (ctx.absenceConfirmedIds?.has(criterion.id)) {
        return result(criterion, {
          status: 'not_met',
          basis: 'confirmed',
          detail: 'Kein passender Nachweis — menschlich bestätigt',
        })
      }

      const token = String(criterion.value)
      const fromProfile = countCertifiedRole(profile, token)
      const fromDocs = countMatchingComplianceDocs(complianceDocs, token)
      const total = fromProfile + fromDocs
      const checked = (profile.certifiedRoles?.length ?? 0) + complianceDocs.length
      const minRequired =
        typeof criterion.value === 'number'
          ? criterion.value
          : typeof criterion.unit === 'string' && Number.isFinite(Number(criterion.unit))
            ? Math.max(1, Number(criterion.unit))
            : 1

      if (total === 0) {
        return result(criterion, {
          status: 'unknown',
          basis: 'text',
          detail: `Verlangt: ${token} · im Bestand kein Nachweis mit diesem Namen erkannt (${checked} geprüft)`,
        })
      }

      const status: EligibilityCompareStatus = total >= minRequired ? 'met' : 'partial'

      return result(criterion, {
        status,
        basis: 'text',
        detail:
          status === 'partial'
            ? `${total} von ${minRequired} Nachweisen für „${token}"`
            : `Nachweis für „${token}" vorhanden (${total})`,
      })
    }
    case 'region': {
      const token = String(criterion.value)
      const regions = profile.regions ?? []
      if (!regions.length) {
        return result(criterion, {
          status: 'unknown',
          basis: 'text',
          detail: 'Regionen im Profil nicht hinterlegt.',
        })
      }
      const match = regions.some(
        (r) => fuzzyContains(r, token) || fuzzyContains(token, r),
      )
      return result(criterion, {
        status: match ? 'met' : 'unknown',
        basis: 'text',
        detail: match
          ? `Region „${token}" im Profil abgedeckt`
          : `Verlangt: ${token} · Profil-Regionen: ${regions.join(', ')}`,
      })
    }
    default:
      return result(criterion, {
        status: 'unknown',
        basis: 'none',
        detail: 'Kriterium nicht automatisch prüfbar — manuell bewerten.',
      })
  }
}

function isKoSignal(
  result: EligibilityCriterionResult,
  confidence: EligibilityConfidence,
): boolean {
  if (!result.mandatory) return false
  if (result.status !== 'not_met') return false
  if (result.basis === 'confirmed') return true
  if (result.basis !== 'numeric') return false
  return confidence === 'high' || confidence === 'medium'
}

function resolveVerdict(
  results: EligibilityCriterionResult[],
  profileEmpty: boolean,
): EligibilityVerdict {
  if (profileEmpty || results.length === 0) return 'unknown'
  if (results.every((r) => r.status === 'unknown')) return 'unknown'

  if (results.some((r) => isKoSignal(r, r.confidence))) return 'ko'

  const mandatoryPartial = results.some(
    (r) =>
      r.mandatory &&
      (r.status === 'partial' || (r.status === 'not_met' && r.confidence === 'low')),
  )
  if (mandatoryPartial) return 'partner_required'

  const anyNotMet = results.some((r) => r.status === 'not_met')
  if (anyNotMet) return 'partner_required'

  const anyMet = results.some((r) => r.status === 'met')
  if (anyMet && !results.some((r) => r.mandatory && r.status === 'not_met')) {
    return 'eligible'
  }

  return 'unknown'
}

export type EligibilityQueue =
  | { kind: 'ko'; count: number }
  | { kind: 'unknown'; withoutProfile: number; unrecognized: number }

/**
 * Dieselbe Rangfolge wie der Summary-Satz: bei K.O. die K.O.-Zahl,
 * sonst Unbekannt — nie `unknownCount` über einem gescheiterten Deal.
 */
export function eligibilityQueue(
  verdict: EligibilityVerdict,
  results: EligibilityCriterionResult[],
): EligibilityQueue {
  const koCount = results.filter((r) => isKoSignal(r, r.confidence)).length
  if (verdict === 'ko') return { kind: 'ko', count: koCount }

  const unknown = results.filter((r) => r.status === 'unknown')
  return {
    kind: 'unknown',
    withoutProfile: unknown.filter((r) => r.basis !== 'text').length,
    unrecognized: unknown.filter((r) => r.basis === 'text').length,
  }
}

function buildSummary(
  verdict: EligibilityVerdict,
  results: EligibilityCriterionResult[],
): string {
  const queue = eligibilityQueue(verdict, results)

  switch (verdict) {
    case 'eligible':
      return 'Alle geprüften Pflichtkriterien erfüllt oder keine harten K.O.-Signale.'
    case 'ko': {
      const count = queue.kind === 'ko' ? queue.count : 0
      return `${count} Pflichtkriterium${count === 1 ? '' : 'ien'} nicht erfüllt — Ausschlussrisiko.`
    }
    case 'partner_required':
      return 'Teilweise Lücken — Partner oder Nachweise prüfen, bevor geboten wird.'
    default: {
      if (queue.kind !== 'unknown') {
        return 'Eignung noch nicht belastbar bewertbar.'
      }
      const { withoutProfile, unrecognized } = queue
      if (withoutProfile === 0 && unrecognized === 0) {
        return 'Eignung noch nicht belastbar bewertbar.'
      }
      const parts: string[] = []
      if (withoutProfile > 0) {
        parts.push(
          `${withoutProfile} ${withoutProfile === 1 ? 'Kriterium' : 'Kriterien'} ohne Profildaten — bitte Fähigkeitsprofil ergänzen.`,
        )
      }
      if (unrecognized > 0) {
        parts.push(
          `${unrecognized} ${unrecognized === 1 ? 'Kriterium' : 'Kriterien'} im Bestand nicht erkannt — kein K.O., manuell prüfen.`,
        )
      }
      return parts.join(' · ')
    }
  }
}

export function compareEligibilityCriteria(
  criteria: EligibilityCriterion[],
  ctx: EligibilityCompareContext,
): EligibilityAssessment {
  const profileEmpty = isCapabilityProfileEmpty(ctx.profile)
  const results = criteria.map((c) => compareCriterion(c, ctx))
  const verdict = resolveVerdict(results, profileEmpty)
  return {
    criteria: results,
    verdict,
    summary: buildSummary(verdict, results),
  }
}

export function eligibilityVerdictLabel(verdict: EligibilityVerdict): string {
  switch (verdict) {
    case 'eligible':
      return 'Bietfähig'
    case 'ko':
      return 'K.O.'
    case 'partner_required':
      return 'Partner / Lücken'
    default:
      return 'Unbekannt'
  }
}

export type EligibilityVerdictTone = 'go' | 'caution' | 'no-bid' | 'muted'

export function eligibilityVerdictTone(
  verdict: EligibilityVerdict,
): EligibilityVerdictTone {
  switch (verdict) {
    case 'eligible':
      return 'go'
    case 'ko':
      return 'no-bid'
    case 'partner_required':
      return 'caution'
    default:
      return 'muted'
  }
}

export function formatCriterionStatusLabel(status: EligibilityCompareStatus): string {
  switch (status) {
    case 'met':
      return '✓ Erfüllt'
    case 'not_met':
      return '✗ Nicht erfüllt'
    case 'partial':
      return '◐ Teilweise'
    default:
      return '? Unbekannt'
  }
}

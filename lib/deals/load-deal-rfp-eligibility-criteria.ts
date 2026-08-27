import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Json } from '@/lib/database.types'
import type { EligibilityCriterion } from '@/lib/deals/eligibility-criteria-schema'
import { parseEligibilityStoredValue } from '@/lib/deals/persist-deal-rfp-eligibility-criteria'

export type EligibilityAbsenceConfirmation = {
  criterionId: string
  confirmedAt: string
  confirmedByName: string | null
}

export type LoadedDealEligibility = {
  criteria: EligibilityCriterion[]
  linkedCriterionIds: string[]
  linkedDocumentIdsByCriterionId: Record<string, string[]>
  absenceByCriterionId: Record<string, EligibilityAbsenceConfirmation>
}

type CriterionDbRow = {
  id: string
  dimension: EligibilityCriterion['dimension']
  label: string
  operator: EligibilityCriterion['operator']
  value: Json
  unit: string | null
  mandatory: boolean
  confidence: EligibilityCriterion['confidence']
  evidence: string | null
  no_matching_evidence_at: string | null
  no_matching_evidence_by: string | null
}

export async function loadDealRfpEligibilityForDeal(
  supabase: SupabaseClient<Database>,
  args: { dealId: string; organizationId: string },
): Promise<LoadedDealEligibility> {
  const empty: LoadedDealEligibility = {
    criteria: [],
    linkedCriterionIds: [],
    linkedDocumentIdsByCriterionId: {},
    absenceByCriterionId: {},
  }

  const { data, error } = await supabase
    .from('deal_rfp_eligibility_criteria')
    .select(
      'id, dimension, label, operator, value, unit, mandatory, confidence, evidence, no_matching_evidence_at, no_matching_evidence_by',
    )
    .eq('deal_id', args.dealId)
    .eq('organization_id', args.organizationId)

  if (error || !data?.length) return empty

  const rows = data as CriterionDbRow[]
  const criteria: EligibilityCriterion[] = []
  const confirmerIds = new Set<string>()
  const pendingAbsence: Array<{
    criterionId: string
    confirmedAt: string
    confirmedBy: string | null
  }> = []

  for (const row of rows) {
    const value = parseEligibilityStoredValue(row.value)
    if (value === null) continue
    criteria.push({
      id: row.id,
      dimension: row.dimension,
      label: row.label,
      operator: row.operator,
      value,
      unit: row.unit ?? undefined,
      mandatory: row.mandatory,
      confidence: row.confidence,
      evidence: row.evidence,
    })
    if (row.no_matching_evidence_at) {
      if (row.no_matching_evidence_by) confirmerIds.add(row.no_matching_evidence_by)
      pendingAbsence.push({
        criterionId: row.id,
        confirmedAt: row.no_matching_evidence_at,
        confirmedBy: row.no_matching_evidence_by,
      })
    }
  }

  const names = new Map<string, string>()
  if (confirmerIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', [...confirmerIds])
    for (const profile of profiles ?? []) {
      if (profile.full_name?.trim()) names.set(profile.id, profile.full_name.trim())
    }
  }

  const absenceByCriterionId: Record<string, EligibilityAbsenceConfirmation> = {}
  for (const item of pendingAbsence) {
    absenceByCriterionId[item.criterionId] = {
      criterionId: item.criterionId,
      confirmedAt: item.confirmedAt,
      confirmedByName: item.confirmedBy ? (names.get(item.confirmedBy) ?? null) : null,
    }
  }

  const ids = criteria.map((c) => c.id)
  if (ids.length === 0) {
    return {
      criteria,
      linkedCriterionIds: [],
      linkedDocumentIdsByCriterionId: {},
      absenceByCriterionId,
    }
  }

  const { data: links } = await supabase
    .from('deal_rfp_eligibility_criterion_documents')
    .select('criterion_id, document_id')
    .eq('organization_id', args.organizationId)
    .in('criterion_id', ids)

  const linkedDocumentIdsByCriterionId: Record<string, string[]> = {}
  for (const row of links ?? []) {
    const list = linkedDocumentIdsByCriterionId[row.criterion_id] ?? []
    list.push(row.document_id)
    linkedDocumentIdsByCriterionId[row.criterion_id] = list
  }
  const linkedCriterionIds = Object.keys(linkedDocumentIdsByCriterionId)

  return {
    criteria,
    linkedCriterionIds,
    linkedDocumentIdsByCriterionId,
    absenceByCriterionId,
  }
}

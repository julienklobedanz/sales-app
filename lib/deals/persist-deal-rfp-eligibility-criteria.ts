import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Json } from '@/lib/database.types'
import type { EligibilityCriterion } from '@/lib/deals/eligibility-criteria-schema'

type EligibilityRow = {
  id: string
  dimension: EligibilityCriterion['dimension']
  label: string
  operator: EligibilityCriterion['operator']
  value: Json
  unit: string | null
  mandatory: boolean
  confidence: EligibilityCriterion['confidence']
  evidence: string | null
}

export function parseEligibilityStoredValue(raw: unknown): number | string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return null
}

function criterionDedupKey(item: EligibilityCriterion): string {
  return JSON.stringify([item.dimension, item.operator, item.value])
}

export function rowsForEligibilityInsert(
  extracted: EligibilityCriterion[],
): EligibilityCriterion[] {
  const seen = new Set<string>()
  const rows: EligibilityCriterion[] = []
  for (const item of extracted) {
    const key = criterionDedupKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(item)
  }
  return rows
}

function toEligibilityCriteria(rows: EligibilityRow[]): EligibilityCriterion[] {
  const out: EligibilityCriterion[] = []
  for (const row of rows) {
    const value = parseEligibilityStoredValue(row.value)
    if (value === null) continue
    out.push({
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
  }
  return out
}

const SELECT_COLS =
  'id, dimension, label, operator, value, unit, mandatory, confidence, evidence' as const

async function loadDealRfpEligibilityCriteriaForDocument(
  supabase: SupabaseClient<Database>,
  args: { dealId: string; sourceDocumentId: string; organizationId: string },
): Promise<{ criteria: EligibilityCriterion[]; error?: string }> {
  const { data, error } = await supabase
    .from('deal_rfp_eligibility_criteria')
    .select(SELECT_COLS)
    .eq('deal_id', args.dealId)
    .eq('source_document_id', args.sourceDocumentId)
    .eq('organization_id', args.organizationId)

  if (error) return { criteria: [], error: error.message }
  return { criteria: toEligibilityCriteria((data ?? []) as EligibilityRow[]) }
}

async function insertDealRfpEligibilityCriteriaForDocument(
  supabase: SupabaseClient<Database>,
  args: {
    dealId: string
    organizationId: string
    sourceDocumentId: string
    extracted: EligibilityCriterion[]
  },
): Promise<{ criteria: EligibilityCriterion[]; error?: string }> {
  const payload = rowsForEligibilityInsert(args.extracted).map((row) => ({
    deal_id: args.dealId,
    organization_id: args.organizationId,
    source_document_id: args.sourceDocumentId,
    dimension: row.dimension,
    label: row.label,
    operator: row.operator,
    value: row.value as Json,
    unit: row.unit ?? null,
    mandatory: row.mandatory,
    confidence: row.confidence,
    evidence: row.evidence ?? null,
  }))

  if (payload.length === 0) return { criteria: [] }

  const { data, error } = await supabase
    .from('deal_rfp_eligibility_criteria')
    .insert(payload)
    .select(SELECT_COLS)

  if (error) return { criteria: [], error: error.message }
  return { criteria: toEligibilityCriteria((data ?? []) as EligibilityRow[]) }
}

/** Lädt vorhandene Zeilen; extract/insert nur wenn das Dokument noch keine hat. */
export async function loadOrCreateDealRfpEligibilityCriteriaForDocument(
  supabase: SupabaseClient<Database>,
  args: {
    dealId: string
    organizationId: string
    sourceDocumentId: string
    extract: () => Promise<{ criteria: EligibilityCriterion[] } | { error: string }>
  },
): Promise<{
  criteria: EligibilityCriterion[]
  created: boolean
  error?: string
}> {
  const loaded = await loadDealRfpEligibilityCriteriaForDocument(supabase, {
    dealId: args.dealId,
    sourceDocumentId: args.sourceDocumentId,
    organizationId: args.organizationId,
  })
  if (loaded.error) return { criteria: [], created: false, error: loaded.error }
  if (loaded.criteria.length > 0) {
    return { criteria: loaded.criteria, created: false }
  }

  const extracted = await args.extract()
  if ('error' in extracted) {
    return { criteria: [], created: false, error: extracted.error }
  }

  const inserted = await insertDealRfpEligibilityCriteriaForDocument(supabase, {
    dealId: args.dealId,
    organizationId: args.organizationId,
    sourceDocumentId: args.sourceDocumentId,
    extracted: extracted.criteria,
  })
  if (inserted.error) return { criteria: [], created: false, error: inserted.error }
  return { criteria: inserted.criteria, created: true }
}

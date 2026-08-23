import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { normalizeToken } from '@/lib/deals/normalize-token'
import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'

type RequirementInput = {
  text: string
  category?: string | null
}

type DealRfpRequirementRecord = {
  id: string
  text: string
  category: string | null
}

function toExtractedRfpRequirements(
  rows: DealRfpRequirementRecord[],
): ExtractedRfpRequirement[] {
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    ...(row.category ? { category: row.category } : {}),
  }))
}

function rowsForRequirementInsert(extracted: RequirementInput[]): Array<{
  text: string
  normalized_text: string
  category: string | null
}> {
  const seen = new Set<string>()
  const rows: Array<{
    text: string
    normalized_text: string
    category: string | null
  }> = []
  for (const item of extracted) {
    const normalized_text = normalizeToken(item.text)
    if (!normalized_text || seen.has(normalized_text)) continue
    seen.add(normalized_text)
    rows.push({
      text: item.text.trim(),
      normalized_text,
      category: item.category?.trim() ? item.category.trim() : null,
    })
  }
  return rows
}

async function loadDealRfpRequirementsForDocument(
  supabase: SupabaseClient,
  args: { sourceDocumentId: string; organizationId: string },
): Promise<{ requirements: ExtractedRfpRequirement[]; error?: string }> {
  const { data, error } = await supabase
    .from('deal_rfp_requirements')
    .select('id, text, category')
    .eq('source_document_id', args.sourceDocumentId)
    .eq('organization_id', args.organizationId)

  if (error) return { requirements: [], error: error.message }
  return { requirements: toExtractedRfpRequirements(data ?? []) }
}

async function insertDealRfpRequirementsForDocument(
  supabase: SupabaseClient,
  args: {
    dealId: string
    organizationId: string
    sourceDocumentId: string
    extracted: RequirementInput[]
  },
): Promise<{ requirements: ExtractedRfpRequirement[]; error?: string }> {
  const payload = rowsForRequirementInsert(args.extracted).map((row) => ({
    deal_id: args.dealId,
    organization_id: args.organizationId,
    source_document_id: args.sourceDocumentId,
    text: row.text,
    normalized_text: row.normalized_text,
    category: row.category,
  }))

  if (payload.length === 0) return { requirements: [] }

  const { data, error } = await supabase
    .from('deal_rfp_requirements')
    .insert(payload)
    .select('id, text, category')

  if (error) return { requirements: [], error: error.message }
  return { requirements: toExtractedRfpRequirements(data ?? []) }
}

/** Lädt vorhandene Zeilen; extract/insert nur wenn das Dokument noch keine hat. */
export async function loadOrCreateDealRfpRequirementsForDocument(
  supabase: SupabaseClient,
  args: {
    dealId: string
    organizationId: string
    sourceDocumentId: string
    extract: () => Promise<{ requirements: RequirementInput[] } | { error: string }>
  },
): Promise<{
  requirements: ExtractedRfpRequirement[]
  created: boolean
  error?: string
}> {
  const loaded = await loadDealRfpRequirementsForDocument(supabase, {
    sourceDocumentId: args.sourceDocumentId,
    organizationId: args.organizationId,
  })
  if (loaded.error) return { requirements: [], created: false, error: loaded.error }
  if (loaded.requirements.length > 0) {
    return { requirements: loaded.requirements, created: false }
  }

  const extracted = await args.extract()
  if ('error' in extracted) {
    return { requirements: [], created: false, error: extracted.error }
  }

  const inserted = await insertDealRfpRequirementsForDocument(supabase, {
    dealId: args.dealId,
    organizationId: args.organizationId,
    sourceDocumentId: args.sourceDocumentId,
    extracted: extracted.requirements,
  })
  if (inserted.error) return { requirements: [], created: false, error: inserted.error }
  return { requirements: inserted.requirements, created: true }
}

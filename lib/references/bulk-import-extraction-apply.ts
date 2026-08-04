import type { SupabaseClient } from '@supabase/supabase-js'

import { resolveOrCreateCompanyForImport } from '@/lib/accounts/resolve-company-for-import'
import { mapBrandfetchIndustriesArrayToGermanCategory } from '@/lib/brandfetch/map-brandfetch-industry-to-de'
import { extractDataFromBuffer } from '@/lib/document-text'
import { normalizeNarrativeText } from '@/lib/references/narrative-normalize'
import type {
  BulkImportExtractionResult,
  BulkImportReviewSuggestions,
} from '@/lib/references/bulk-import-review-types'
import { asTableUpdate } from '@/lib/supabase/db-types'

function pushSuggestion(
  out: BulkImportReviewSuggestions,
  key: keyof BulkImportReviewSuggestions,
  value: string | null | undefined,
) {
  const v = String(value ?? '').trim()
  if (!v) return
  const cur = out[key] ?? []
  if (!cur.includes(v)) out[key] = [...cur, v]
}

type RefRow = {
  id: string
  title: string | null
  company_id: string
  summary: string | null
  industry: string | null
  volume_eur: string | null
  customer_challenge: string | null
  our_solution: string | null
  tags: string | null
  employee_count: number | null
  website: string | null
  country: string | null
}

/**
 * PDF/Text parsen und Felder in die Referenz schreiben (unabhängig von Storage).
 */
export async function applyBulkImportExtractionFromBuffer(
  supabase: SupabaseClient,
  organizationId: string,
  referenceId: string,
  buffer: Buffer,
  fileName: string,
): Promise<BulkImportExtractionResult> {
  const id = String(referenceId ?? '').trim()
  if (!id) return { success: false, error: 'Ungültige Referenz.' }

  const { data: ref, error: refErr } = await supabase
    .from('references')
    .select(
      'id, title, company_id, summary, industry, volume_eur, customer_challenge, our_solution, tags, employee_count, website, country, incumbent_provider, competitors, contract_type, project_start, project_end, project_status',
    )
    .eq('id', id)
    .maybeSingle()

  if (refErr || !ref) return { success: false, error: 'Referenz nicht gefunden.' }
  const refRow = ref as RefRow & {
    incumbent_provider: string | null
    competitors: string | null
    contract_type: string | null
    project_start: string | null
    project_end: string | null
    project_status: string | null
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, organization_id')
    .eq('id', refRow.company_id)
    .maybeSingle()

  if (!company || company.organization_id !== organizationId) {
    return { success: false, error: 'Keine Berechtigung für diese Referenz.' }
  }

  const suggestions: BulkImportReviewSuggestions = {}
  const extracted = await extractDataFromBuffer(buffer, fileName, null, {
    allowHeuristicFallback: true,
  })

  if (!extracted.success) {
    return {
      success: true,
      referenceId: id,
      title: String(refRow.title ?? ''),
      needsInput: true,
      extractionOk: false,
      extractionError: extracted.error,
      suggestions,
    }
  }

  let extractionOk = true
  let extractionError: string | undefined
  const llmSkipped = !process.env.OPENAI_API_KEY
  const d = extracted.data

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  let companyId = refRow.company_id

  const companyHint = d.company_name?.trim() || String(company.name ?? '').trim()
  if (companyHint) {
    const resolved = await resolveOrCreateCompanyForImport(
      supabase,
      organizationId,
      companyHint,
    )
    if (resolved.success) {
      const co = resolved.company
      companyId = co.companyId
      if (co.companyId !== refRow.company_id) patch.company_id = companyId
      if (!String(refRow.website ?? '').trim() && co.website_url)
        patch.website = co.website_url
      if (!String(refRow.country ?? '').trim() && co.headquarters)
        patch.country = co.headquarters
      if (!String(refRow.industry ?? '').trim() && co.industry)
        patch.industry = co.industry
      if (refRow.employee_count == null && co.employee_count != null) {
        patch.employee_count = co.employee_count
      }
    }
  }

  const titleNow = String(refRow.title ?? '').trim()
  const fileStem = fileName.replace(/\.[^.]+$/, '').trim()
  const titleLooksLikeFilename =
    titleNow.toLowerCase() === fileStem.toLowerCase() || /^projekt\s*[-–]/i.test(titleNow)
  const titleLooksLikeBoilerplate = /^Die\s+.+\s+ist\s+/i.test(titleNow)

  if (
    d.title?.trim() &&
    (!titleNow ||
      titleNow === 'Referenz' ||
      titleLooksLikeFilename ||
      titleLooksLikeBoilerplate)
  ) {
    patch.title = d.title.trim()
  } else if (d.title?.trim() && d.title.trim() !== titleNow) {
    pushSuggestion(suggestions, 'title', d.title)
  }

  const summaryNow = String(refRow.summary ?? '').trim()
  const summaryIsCompanyBoilerplate = /^Die\s+.+\s+ist\s+/i.test(summaryNow)
  if (d.summary?.trim() && (!summaryNow || summaryIsCompanyBoilerplate)) {
    patch.summary = normalizeNarrativeText(d.summary)
  } else if (d.summary?.trim()) {
    pushSuggestion(suggestions, 'summary', normalizeNarrativeText(d.summary))
  }

  if (d.customer_challenge?.trim() && !String(refRow.customer_challenge ?? '').trim()) {
    patch.customer_challenge = normalizeNarrativeText(d.customer_challenge)
  } else if (d.customer_challenge?.trim()) {
    pushSuggestion(
      suggestions,
      'customer_challenge',
      normalizeNarrativeText(d.customer_challenge),
    )
  }

  if (d.our_solution?.trim() && !String(refRow.our_solution ?? '').trim()) {
    patch.our_solution = normalizeNarrativeText(d.our_solution)
  } else if (d.our_solution?.trim()) {
    pushSuggestion(suggestions, 'our_solution', normalizeNarrativeText(d.our_solution))
  }

  if (d.volume_eur?.trim() && !String(refRow.volume_eur ?? '').trim()) {
    patch.volume_eur = d.volume_eur.trim()
  } else if (d.volume_eur?.trim()) {
    pushSuggestion(suggestions, 'volume_eur', d.volume_eur.trim())
  }

  if (d.industry?.trim() && !String(refRow.industry ?? '').trim()) {
    const mapped =
      mapBrandfetchIndustriesArrayToGermanCategory([{ name: d.industry }]) ??
      d.industry.trim()
    patch.industry = mapped
  } else if (d.industry?.trim()) {
    const mapped =
      mapBrandfetchIndustriesArrayToGermanCategory([{ name: d.industry }]) ??
      d.industry.trim()
    pushSuggestion(suggestions, 'industry', mapped)
  }

  if (d.tags?.length && !String(refRow.tags ?? '').trim()) {
    patch.tags = d.tags
      .map((t) => t.trim())
      .filter(Boolean)
      .join(', ')
  }

  if (d.employee_count != null && refRow.employee_count == null) {
    patch.employee_count = d.employee_count
  }

  if (d.incumbent_provider?.trim() && !String(refRow.incumbent_provider ?? '').trim()) {
    patch.incumbent_provider = d.incumbent_provider.trim()
  } else if (d.incumbent_provider?.trim()) {
    pushSuggestion(suggestions, 'incumbent_provider', d.incumbent_provider.trim())
  }

  if (d.competitors?.trim() && !String(refRow.competitors ?? '').trim()) {
    patch.competitors = d.competitors.trim()
  } else if (d.competitors?.trim()) {
    pushSuggestion(suggestions, 'competitors', d.competitors.trim())
  }

  if (d.contract_type?.trim() && !String(refRow.contract_type ?? '').trim()) {
    patch.contract_type = d.contract_type.trim()
  }

  const addMonthsIso = (iso: string, months: number): string => {
    const dte = new Date(`${iso}T12:00:00Z`)
    dte.setUTCMonth(dte.getUTCMonth() + months)
    return dte.toISOString().slice(0, 10)
  }
  let start = d.project_start?.trim() || null
  let end = d.project_end?.trim() || null
  const months =
    typeof d.duration_months === 'number' && d.duration_months > 0
      ? Math.round(d.duration_months)
      : null
  if (months && start && !end) end = addMonthsIso(start, months)
  if (months && end && !start) start = addMonthsIso(end, -months)

  if (start && !String(refRow.project_start ?? '').trim()) patch.project_start = start
  if (end && !String(refRow.project_end ?? '').trim()) patch.project_end = end
  if ((start || end) && !String(refRow.project_status ?? '').trim()) {
    patch.project_status = 'completed'
  }

  const { data: companyFull } = await supabase
    .from('companies')
    .select('website_url, headquarters, industry, employee_count')
    .eq('id', companyId)
    .maybeSingle()

  if (companyFull) {
    if (!String(refRow.website ?? '').trim() && companyFull.website_url) {
      patch.website = companyFull.website_url
    }
    if (!String(refRow.country ?? '').trim() && companyFull.headquarters) {
      patch.country = companyFull.headquarters
    }
    if (!String(refRow.industry ?? '').trim() && companyFull.industry) {
      patch.industry = companyFull.industry
    }
    if (refRow.employee_count == null && companyFull.employee_count != null) {
      patch.employee_count = companyFull.employee_count
    }
  }

  if (Object.keys(patch).length > 1) {
    const { error: updateErr } = await supabase
      .from('references')
      .update(asTableUpdate<'references'>(patch))
      .eq('id', id)
    if (updateErr) {
      extractionError = updateErr.message
      extractionOk = false
    }
  }

  const { data: after } = await supabase
    .from('references')
    .select('title, customer_challenge, our_solution')
    .eq('id', id)
    .maybeSingle()

  const title = String(after?.title ?? refRow.title ?? '')
  const needsInput =
    !String(after?.customer_challenge ?? '').trim() ||
    !String(after?.our_solution ?? '').trim()

  if (needsInput && llmSkipped && !extractionError) {
    extractionError =
      'Herausforderung und/oder Lösung fehlen noch — bitte im Editor ergänzen oder OpenAI-Credits aktivieren.'
  }

  return {
    success: true,
    referenceId: id,
    title,
    needsInput,
    extractionOk,
    extractionError,
    suggestions,
  }
}

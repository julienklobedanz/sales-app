'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { extractDataFromBuffer } from '@/lib/document-extraction'
import { resolveOrCreateCompanyForImport } from '@/lib/accounts/resolve-company-for-import'
import { mapBrandfetchIndustriesArrayToGermanCategory } from '@/lib/brandfetch/map-brandfetch-industry-to-de'
import { normalizeNarrativeText } from '@/lib/references/narrative-normalize'
import type {
  BulkImportExtractionResult,
  BulkImportReviewSuggestions,
} from '@/lib/references/bulk-import-review-types'

function pushSuggestion(
  out: BulkImportReviewSuggestions,
  key: keyof BulkImportReviewSuggestions,
  value: string | null | undefined
) {
  const v = String(value ?? '').trim()
  if (!v) return
  const cur = out[key] ?? []
  if (!cur.includes(v)) out[key] = [...cur, v]
}

/**
 * Eine importierte Referenz: erstes Asset aus Storage laden, Text+LLM/Heuristik, Merge in DB.
 */
export async function runBulkImportExtractionForReference(
  referenceId: string
): Promise<BulkImportExtractionResult> {
  const id = String(referenceId ?? '').trim()
  if (!id) return { success: false, error: 'Ungültige Referenz.' }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, error: 'Nur Admins können den Import abschließen.' }
  }
  const organizationId = profile?.organization_id ?? null
  if (!organizationId) return { success: false, error: 'Keine Organisation.' }

  const { data: ref, error: refErr } = await supabase
    .from('references')
    .select(
      'id, title, company_id, summary, industry, volume_eur, customer_challenge, our_solution, tags, employee_count, file_path'
    )
    .eq('id', id)
    .maybeSingle()

  if (refErr || !ref) return { success: false, error: 'Referenz nicht gefunden.' }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, organization_id')
    .eq('id', ref.company_id)
    .maybeSingle()

  if (!company || company.organization_id !== organizationId) {
    return { success: false, error: 'Keine Berechtigung für diese Referenz.' }
  }

  const { data: assets } = await supabase
    .from('reference_assets')
    .select('file_path, file_name')
    .eq('reference_id', id)
    .order('created_at', { ascending: true })
    .limit(1)

  const path = assets?.[0]?.file_path ?? (ref.file_path as string | null) ?? null
  const fileName = assets?.[0]?.file_name ?? path?.split('/').pop() ?? 'document.pdf'

  const suggestions: BulkImportReviewSuggestions = {}
  let extractionOk = false
  let extractionError: string | undefined
  let llmSkipped = false

  if (!path) {
    extractionError = 'Keine Datei am Import gefunden.'
    revalidatePath(ROUTES.evidence.root)
    return {
      success: true,
      referenceId: id,
      title: String(ref.title ?? ''),
      needsInput: true,
      extractionOk: false,
      extractionError,
      suggestions,
    }
  }

  const { data: blob, error: dlErr } = await supabase.storage.from('references').download(path)
  if (dlErr || !blob) {
    extractionError = 'Datei konnte nicht geladen werden.'
    revalidatePath(ROUTES.evidence.root)
    return {
      success: true,
      referenceId: id,
      title: String(ref.title ?? ''),
      needsInput: true,
      extractionOk: false,
      extractionError,
      suggestions,
    }
  }

  const buffer = Buffer.from(await blob.arrayBuffer())
  const extracted = await extractDataFromBuffer(buffer, fileName, null, {
    allowHeuristicFallback: true,
  })

  if (!extracted.success) {
    extractionError = extracted.error
    revalidatePath(ROUTES.evidence.root)
    return {
      success: true,
      referenceId: id,
      title: String(ref.title ?? ''),
      needsInput: true,
      extractionOk: false,
      extractionError,
      suggestions,
    }
  }

  extractionOk = true
  const d = extracted.data
  if (!process.env.OPENAI_API_KEY) {
    llmSkipped = true
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  let companyId = ref.company_id as string

  if (d.company_name?.trim()) {
    const currentName = String(company.name ?? '').trim()
    const unknown =
      /^unbekannter kunde$/i.test(currentName) || /^import\s*\(/i.test(currentName)
    if (unknown || currentName.toLowerCase() !== d.company_name.trim().toLowerCase()) {
      const resolved = await resolveOrCreateCompanyForImport(
        supabase,
        organizationId,
        d.company_name.trim()
      )
      if (resolved.success) {
        companyId = resolved.companyId
        patch.company_id = companyId
      }
    }
  }

  const titleNow = String(ref.title ?? '').trim()
  const fileStem = fileName.replace(/\.[^.]+$/, '').trim()
  const titleLooksLikeFilename =
    titleNow.toLowerCase() === fileStem.toLowerCase() || /^projekt\s*[-–]/i.test(titleNow)

  if (d.title?.trim() && (!titleNow || titleNow === 'Referenz' || titleLooksLikeFilename)) {
    patch.title = d.title.trim()
  } else if (d.title?.trim() && d.title.trim() !== titleNow) {
    pushSuggestion(suggestions, 'title', d.title)
  }

  if (d.summary?.trim() && !String(ref.summary ?? '').trim()) {
    patch.summary = normalizeNarrativeText(d.summary)
  } else if (d.summary?.trim()) {
    pushSuggestion(suggestions, 'summary', normalizeNarrativeText(d.summary))
  }

  if (d.customer_challenge?.trim() && !String(ref.customer_challenge ?? '').trim()) {
    patch.customer_challenge = normalizeNarrativeText(d.customer_challenge)
  } else if (d.customer_challenge?.trim()) {
    pushSuggestion(suggestions, 'customer_challenge', normalizeNarrativeText(d.customer_challenge))
  }

  if (d.our_solution?.trim() && !String(ref.our_solution ?? '').trim()) {
    patch.our_solution = normalizeNarrativeText(d.our_solution)
  } else if (d.our_solution?.trim()) {
    pushSuggestion(suggestions, 'our_solution', normalizeNarrativeText(d.our_solution))
  }

  if (d.volume_eur?.trim() && !String(ref.volume_eur ?? '').trim()) {
    patch.volume_eur = d.volume_eur.trim()
  } else if (d.volume_eur?.trim()) {
    pushSuggestion(suggestions, 'volume_eur', d.volume_eur.trim())
  }

  if (d.industry?.trim() && !String(ref.industry ?? '').trim()) {
    const mapped =
      mapBrandfetchIndustriesArrayToGermanCategory([{ name: d.industry }]) ?? d.industry.trim()
    patch.industry = mapped
  } else if (d.industry?.trim()) {
    const mapped =
      mapBrandfetchIndustriesArrayToGermanCategory([{ name: d.industry }]) ?? d.industry.trim()
    pushSuggestion(suggestions, 'industry', mapped)
  }

  if (d.tags?.length && !String(ref.tags ?? '').trim()) {
    patch.tags = d.tags.map((t) => t.trim()).filter(Boolean).join(', ')
  }

  if (d.employee_count != null && ref.employee_count == null) {
    patch.employee_count = d.employee_count
  }

  if (Object.keys(patch).length > 1) {
    const { error: updateErr } = await supabase.from('references').update(patch).eq('id', id)
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

  const title = String(after?.title ?? ref.title ?? '')
  const needsInput =
    !String(after?.customer_challenge ?? '').trim() || !String(after?.our_solution ?? '').trim()

  if (needsInput && llmSkipped && !extractionError) {
    extractionError =
      'Herausforderung und/oder Lösung fehlen noch — bitte im Editor ergänzen oder OpenAI-Credits aktivieren.'
  }

  revalidatePath(ROUTES.evidence.root)
  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.evidence.edit(id))

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

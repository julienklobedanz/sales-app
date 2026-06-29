'use server'

import { revalidateTag } from 'next/cache'

import { dealProofCoverageTag, getCachedDealProofCoverage } from '@/lib/accounts/deal-proof-coverage'
import { parseRequirementsTextToExtracted } from '@/lib/accounts/deal-requirements-parse'
import type { RfpCoverageRow } from '@/lib/rfp-coverage-types'
import { loadReferenceVisibilityForUser } from '@/lib/roles/load-reference-visibility'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type DealRequirementRow = {
  id: string
  deal_id: string
  organization_id: string
  label: string
  sort_order: number
  created_at: string
}

async function assertDealInOrg(dealId: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' as const }

  const visibility = await loadReferenceVisibilityForUser(supabase, user.id)
  if (!visibility) return { error: 'Keine Organisation zugeordnet.' as const }

  const { data: deal, error } = await supabase
    .from('deals')
    .select('id, organization_id, requirements_text')
    .eq('id', dealId)
    .eq('organization_id', visibility.organizationId)
    .maybeSingle()

  if (error || !deal) return { error: 'Deal nicht gefunden oder keine Berechtigung.' as const }

  return { supabase, visibility, deal, user }
}

function invalidateDealCoverage(dealId: string) {
  revalidateTag(dealProofCoverageTag(dealId), 'max')
}

export async function listDealRequirementsAction(
  dealId: string
): Promise<{ success: true; rows: DealRequirementRow[] } | { success: false; error: string }> {
  const ctx = await assertDealInOrg(dealId)
  if ('error' in ctx) return { success: false, error: ctx.error ?? 'Unbekannter Fehler.' }

  const { data, error } = await ctx.supabase
    .from('deal_requirements')
    .select('id, deal_id, organization_id, label, sort_order, created_at')
    .eq('deal_id', dealId)
    .eq('organization_id', ctx.visibility.organizationId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    if (/deal_requirements/i.test(error.message ?? '')) {
      return { success: true, rows: [] }
    }
    return { success: false, error: error.message }
  }

  return { success: true, rows: (data ?? []) as DealRequirementRow[] }
}

export async function addDealRequirementAction(
  dealId: string,
  label: string
): Promise<{ success: true; row: DealRequirementRow } | { success: false; error: string }> {
  const trimmed = label.trim()
  if (!trimmed) return { success: false, error: 'Bitte ein Kriterium eingeben.' }

  const ctx = await assertDealInOrg(dealId)
  if ('error' in ctx) return { success: false, error: ctx.error ?? 'Unbekannter Fehler.' }

  const { data: existing } = await ctx.supabase
    .from('deal_requirements')
    .select('sort_order')
    .eq('deal_id', dealId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = ((existing?.[0] as { sort_order?: number } | undefined)?.sort_order ?? -1) + 1

  const { data, error } = await ctx.supabase
    .from('deal_requirements')
    .insert({
      deal_id: dealId,
      organization_id: ctx.visibility.organizationId,
      label: trimmed,
      sort_order: nextOrder,
    })
    .select('id, deal_id, organization_id, label, sort_order, created_at')
    .single()

  if (error || !data) return { success: false, error: error?.message ?? 'Speichern fehlgeschlagen.' }

  invalidateDealCoverage(dealId)
  return { success: true, row: data as DealRequirementRow }
}

export async function removeDealRequirementAction(
  requirementId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const visibility = await loadReferenceVisibilityForUser(supabase, user.id)
  if (!visibility) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const { data: row } = await supabase
    .from('deal_requirements')
    .select('deal_id')
    .eq('id', requirementId)
    .eq('organization_id', visibility.organizationId)
    .maybeSingle()

  const { error } = await supabase
    .from('deal_requirements')
    .delete()
    .eq('id', requirementId)
    .eq('organization_id', visibility.organizationId)

  if (error) return { success: false, error: error.message }

  if (row?.deal_id) invalidateDealCoverage(String(row.deal_id))
  return { success: true }
}

export async function importDealRequirementsFromTextAction(
  dealId: string
): Promise<{ success: true; imported: number } | { success: false; error: string }> {
  const ctx = await assertDealInOrg(dealId)
  if ('error' in ctx) return { success: false, error: ctx.error ?? 'Unbekannter Fehler.' }

  const parsed = parseRequirementsTextToExtracted(
    (ctx.deal as { requirements_text?: string | null }).requirements_text
  )
  if (parsed.length === 0) {
    return { success: false, error: 'Keine Zeilen in der Deal-Beschreibung gefunden.' }
  }

  const { data: existing } = await ctx.supabase
    .from('deal_requirements')
    .select('label, sort_order')
    .eq('deal_id', dealId)

  const existingLabels = new Set(
    (existing ?? []).map((r) => String((r as { label: string }).label).trim().toLowerCase())
  )
  let sortOrder =
    (existing ?? []).reduce(
      (max, r) => Math.max(max, Number((r as { sort_order?: number }).sort_order ?? 0)),
      -1
    ) + 1

  const toInsert = parsed
    .filter((p) => !existingLabels.has(p.text.trim().toLowerCase()))
    .map((p) => ({
      deal_id: dealId,
      organization_id: ctx.visibility.organizationId,
      label: p.text,
      sort_order: sortOrder++,
    }))

  if (toInsert.length === 0) {
    return { success: true, imported: 0 }
  }

  const { error } = await ctx.supabase.from('deal_requirements').insert(toInsert)
  if (error) return { success: false, error: error.message }

  invalidateDealCoverage(dealId)
  return { success: true, imported: toInsert.length }
}

export async function importDealRequirementsFromRfpAction(
  dealId: string
): Promise<{ success: true; imported: number } | { success: false; error: string }> {
  const ctx = await assertDealInOrg(dealId)
  if ('error' in ctx) return { success: false, error: ctx.error ?? 'Unbekannter Fehler.' }

  const { data: analysis, error: analysisErr } = await ctx.supabase
    .from('deal_rfp_analyses')
    .select('extracted_requirements')
    .eq('deal_id', dealId)
    .eq('organization_id', ctx.visibility.organizationId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (analysisErr || !analysis) {
    return { success: false, error: 'Keine abgeschlossene RFP-Analyse für diesen Deal.' }
  }

  const raw = analysis.extracted_requirements
  if (!Array.isArray(raw) || raw.length === 0) {
    return { success: false, error: 'RFP-Analyse enthält keine Anforderungen.' }
  }

  const { data: existing } = await ctx.supabase
    .from('deal_requirements')
    .select('label, sort_order')
    .eq('deal_id', dealId)

  const existingLabels = new Set(
    (existing ?? []).map((r) => String((r as { label: string }).label).trim().toLowerCase())
  )
  let sortOrder =
    (existing ?? []).reduce(
      (max, r) => Math.max(max, Number((r as { sort_order?: number }).sort_order ?? 0)),
      -1
    ) + 1

  const toInsert = raw
    .map((item) => {
      const obj = item as { text?: string }
      const text = String(obj.text ?? '').trim()
      if (!text) return null
      return text
    })
    .filter((text): text is string => Boolean(text))
    .filter((text) => !existingLabels.has(text.toLowerCase()))
    .map((text) => ({
      deal_id: dealId,
      organization_id: ctx.visibility.organizationId,
      label: text,
      sort_order: sortOrder++,
    }))

  if (toInsert.length === 0) return { success: true, imported: 0 }

  const { error } = await ctx.supabase.from('deal_requirements').insert(toInsert)
  if (error) return { success: false, error: error.message }

  invalidateDealCoverage(dealId)
  return { success: true, imported: toInsert.length }
}

export async function fetchDealProofCoverageAction(
  dealId: string
): Promise<
  | {
      success: true
      dealTitle: string | null
      coverage: RfpCoverageRow[]
    }
  | { success: false; error: string }
> {
  const ctx = await assertDealInOrg(dealId)
  if ('error' in ctx) return { success: false, error: ctx.error ?? 'Unbekannter Fehler.' }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'OpenAI API ist nicht konfiguriert (OPENAI_API_KEY).' }
  }

  const requirements = await listDealRequirementsAction(dealId)
  if (!requirements.success) return requirements
  if (requirements.rows.length === 0) {
    return { success: true, dealTitle: null, coverage: [] }
  }

  const result = await getCachedDealProofCoverage({
    organizationId: ctx.visibility.organizationId,
    dealId,
    salesVisibleOnly: ctx.visibility.salesVisibleOnly,
    apiKey,
  })

  return { success: true, dealTitle: result.dealTitle, coverage: result.coverage }
}

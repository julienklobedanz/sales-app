import 'server-only'

import { matchReferencesImpl } from '@/lib/references/library/match'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type DealReferenceSuggestion = {
  id: string
  title: string
  companyName: string
  similarity: number
  snippet: string | null
}

export async function suggestDealReferenceMatches(
  dealId: string,
  options?: { queryOverride?: string; limit?: number }
): Promise<{ suggestions: DealReferenceSuggestion[] }> {
  const limit = Math.min(3, Math.max(1, options?.limit ?? 3))
  const supabase = await createServerSupabaseClient()

  const { data: deal } = await supabase
    .from('deals')
    .select('id, title, industry, requirements_text, company_id, companies(name)')
    .eq('id', dealId)
    .maybeSingle()

  if (!deal) return { suggestions: [] }

  const company = Array.isArray(deal.companies)
    ? (deal.companies[0] as { name?: string } | undefined)
    : (deal.companies as { name?: string } | null)
  const companyName = company?.name?.trim() ?? ''

  const parts = [
    options?.queryOverride?.trim(),
    deal.title?.trim(),
    deal.industry?.trim(),
    companyName,
    deal.requirements_text?.trim(),
  ].filter(Boolean)

  const query = parts.join(' · ')
  if (!query) return { suggestions: [] }

  const { data: linked } = await supabase
    .from('deal_references')
    .select('reference_id')
    .eq('deal_id', dealId)
  const linkedIds = new Set((linked ?? []).map((r) => String(r.reference_id)))

  const result = await matchReferencesImpl(query, dealId, { matchCount: limit + linkedIds.size })
  if (!result.success || !result.matches?.length) return { suggestions: [] }

  const suggestions: DealReferenceSuggestion[] = []
  for (const hit of result.matches) {
    if (linkedIds.has(hit.id)) continue
    suggestions.push({
      id: hit.id,
      title: hit.title,
      companyName: hit.companyName?.trim() || '—',
      similarity: hit.similarity,
      snippet: hit.snippet ?? null,
    })
    if (suggestions.length >= limit) break
  }

  return { suggestions }
}

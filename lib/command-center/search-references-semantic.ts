import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { CommandSearchResult } from '@/lib/command-center/global-search'
import {
  enrichHomepageSemanticQuery,
  parseVolumeConstraintFromQuery,
  referenceVolumeMatchesConstraint,
} from '@/lib/command-center/homepage-semantic-query'
import type { HomepageSemanticReferenceHit } from '@/lib/command-center/homepage-semantic-types'
import { embedTextWithOpenAI } from '@/lib/embeddings-openai'
import { rpcMatchReferences } from '@/lib/match-references-rpc'
import { snippetFromSummary } from '@/lib/match-reference-snippet'
import { fetchCompanyFieldsForReferenceIds } from '@/lib/references/enrich-match-hits-company'
import { logReferenceMatched } from '@/lib/events/log-reference-matched'

export const HOME_SEMANTIC_MATCH_THRESHOLD = 0.42
export const HOME_SEMANTIC_MATCH_COUNT = 12

type SemanticSearchParams = {
  supabase: SupabaseClient
  apiKey: string
  query: string
  organizationId: string
  salesVisibleOnly: boolean
  matchThreshold?: number
  matchCount?: number
}

async function runSemanticMatch(
  params: SemanticSearchParams & { embedInput: string }
): Promise<{ rows: Awaited<ReturnType<typeof rpcMatchReferences>>['rows']; error?: string }> {
  const emb = await embedTextWithOpenAI(params.apiKey, params.embedInput)
  if ('error' in emb) {
    return { rows: [], error: emb.error }
  }

  const { rows, error } = await rpcMatchReferences(params.supabase, {
    queryEmbedding: emb.embedding,
    matchThreshold: params.matchThreshold ?? HOME_SEMANTIC_MATCH_THRESHOLD,
    matchCount: params.matchCount ?? HOME_SEMANTIC_MATCH_COUNT,
    organizationId: params.organizationId,
    salesVisibleOnly: params.salesVisibleOnly,
  })

  if (error) return { rows: [], error }
  return { rows }
}

/** Homepage: angereicherter Query, volle Karten-Daten. */
export async function searchHomepageReferencesSemantic(
  params: SemanticSearchParams
): Promise<{ ok: true; hits: HomepageSemanticReferenceHit[] } | { ok: false; error: string }> {
  const trimmed = params.query.trim()
  if (!trimmed) return { ok: true, hits: [] }

  const volumeConstraint = parseVolumeConstraintFromQuery(trimmed)
  const matchCount = params.matchCount ?? HOME_SEMANTIC_MATCH_COUNT
  const fetchCount = volumeConstraint ? Math.max(matchCount * 4, 36) : matchCount

  const { rows, error } = await runSemanticMatch({
    ...params,
    embedInput: enrichHomepageSemanticQuery(trimmed),
    matchCount: fetchCount,
  })

  if (error) return { ok: false, error }

  const matchedRows = volumeConstraint
    ? rows.filter((r) => referenceVolumeMatchesConstraint(r.volume_eur, volumeConstraint))
    : rows

  const baseHits: HomepageSemanticReferenceHit[] = matchedRows.slice(0, matchCount).map((r) => {
    const summary = r.summary?.trim() ?? null
    const title = r.title ?? ''
    const volRaw = r.volume_eur?.trim() ?? null
    return {
      id: r.id,
      title,
      summary,
      industry: r.industry ?? null,
      similarity: typeof r.similarity === 'number' ? r.similarity : 0,
      snippet: snippetFromSummary(summary, title),
      companyName: r.company_name?.trim() ? r.company_name : null,
      companyId: null,
      companyLogoUrl: null,
      volumeEur: volRaw && volRaw.length > 0 ? volRaw : null,
    }
  })

  const companyByRef = await fetchCompanyFieldsForReferenceIds(
    params.supabase,
    baseHits.map((h) => h.id)
  )

  const hits = baseHits.map((h) => {
    const co = companyByRef.get(h.id)
    if (!co) return h
    return {
      ...h,
      companyId: co.companyId,
      companyName: h.companyName ?? co.companyName,
      companyLogoUrl: co.companyLogoUrl,
    }
  })

  void logReferenceMatched({
    organizationId: params.organizationId,
    matchedReferenceIds: hits.map((h) => h.id),
    source: 'homepage',
    matchThreshold: params.matchThreshold ?? HOME_SEMANTIC_MATCH_THRESHOLD,
  })

  return { ok: true, hits }
}

/** Legacy-Fallback für gemischte Command-Search. */
export async function searchReferencesSemanticLegacy(
  params: SemanticSearchParams
): Promise<
  | { ok: true; hits: Extract<CommandSearchResult, { kind: 'reference' }>[] }
  | { ok: false; error: string }
> {
  const trimmed = params.query.trim()
  if (!trimmed) return { ok: true, hits: [] }

  const { rows, error } = await runSemanticMatch({
    ...params,
    embedInput: trimmed,
    matchThreshold: params.matchThreshold ?? 0.52,
    matchCount: params.matchCount ?? 10,
  })

  if (error) return { ok: false, error }

  const hits = rows.map((r) => ({
    kind: 'reference' as const,
    id: r.id,
    title: r.title ?? '',
    accountName: r.company_name?.trim() ? r.company_name : null,
    industry: r.industry ?? null,
    similarity: typeof r.similarity === 'number' ? r.similarity : 0,
  }))

  void logReferenceMatched({
    organizationId: params.organizationId,
    matchedReferenceIds: hits.map((h) => h.id),
    source: 'command',
    matchThreshold: params.matchThreshold ?? 0.52,
  })

  return { ok: true, hits }
}

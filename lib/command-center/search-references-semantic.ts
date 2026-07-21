import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { CommandSearchResult } from '@/lib/command-center/global-search'
import {
  enrichHomepageSemanticQuery,
  parseVolumeConstraintFromQuery,
  referenceVolumeMatchesConstraint,
} from '@/lib/command-center/homepage-semantic-query'
import type { HomepageSemanticReferenceHit } from '@/lib/command-center/homepage-semantic-types'
import { embedTextWithOpenAICached } from '@/lib/embeddings/cached-embed-query'
import { rpcMatchReferences } from '@/lib/match-references-rpc'
import { snippetFromSummary } from '@/lib/match-reference-snippet'
import { fetchCompanyFieldsForReferenceIds } from '@/lib/references/enrich-match-hits-company'
import { logReferenceMatched } from '@/lib/events/log-reference-matched'
import { log } from '@/lib/observability/logger'
import { withTiming } from '@/lib/observability/timing'

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
  params: SemanticSearchParams & { embedInput: string; source: 'homepage' | 'command' }
): Promise<{
  rows: Awaited<ReturnType<typeof rpcMatchReferences>>['rows']
  error?: string
  durationMs: number
}> {
  const totalStart = performance.now()
  const timingCtx = { organizationId: params.organizationId, source: params.source }

  const embeddingStart = performance.now()
  const emb = await embedTextWithOpenAICached(params.apiKey, params.embedInput)
  const embeddingMs = Math.round(performance.now() - embeddingStart)
  if ('error' in emb) {
    return { rows: [], error: emb.error, durationMs: Math.round(performance.now() - totalStart) }
  }
  log.info('command.semantic.embedding', {
    label: 'command.semantic.embedding',
    ms: embeddingMs,
    cacheHit: emb.cacheHit,
    ...timingCtx,
  })

  const { result: rpcResult, ms: rpcMs } = await withTiming(
    'command.semantic.rpc',
    () =>
      rpcMatchReferences(params.supabase, {
        queryEmbedding: emb.embedding,
        matchThreshold: params.matchThreshold ?? HOME_SEMANTIC_MATCH_THRESHOLD,
        matchCount: params.matchCount ?? HOME_SEMANTIC_MATCH_COUNT,
        organizationId: params.organizationId,
        salesVisibleOnly: params.salesVisibleOnly,
      }),
    timingCtx
  )

  const durationMs = Math.round(performance.now() - totalStart)
  log.info('command.semantic.total', {
    label: 'command.semantic.total',
    ms: durationMs,
    ...timingCtx,
    embeddingMs,
    rpcMs,
    resultCount: rpcResult.rows.length,
  })

  if (rpcResult.error) return { rows: [], error: rpcResult.error, durationMs }
  return { rows: rpcResult.rows, durationMs }
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

  const { rows, error, durationMs } = await runSemanticMatch({
    ...params,
    embedInput: enrichHomepageSemanticQuery(trimmed),
    matchCount: fetchCount,
    source: 'homepage',
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
      createdAt: r.created_at ?? null,
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
    durationMs,
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

  const { rows, error, durationMs } = await runSemanticMatch({
    ...params,
    embedInput: trimmed,
    matchThreshold: params.matchThreshold ?? 0.52,
    matchCount: params.matchCount ?? 10,
    source: 'command',
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
    durationMs,
  })

  return { ok: true, hits }
}

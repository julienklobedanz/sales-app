'use server'

import { loadReferenceVisibilityForUser } from '@/lib/roles/load-reference-visibility'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { embedTextWithOpenAICached } from '@/lib/embeddings/cached-embed-query'
import { rpcMatchReferences } from '@/lib/match/match-references-rpc'
import { snippetFromSummary } from '@/lib/match/match-reference-snippet'
import { logReferenceMatched } from '@/lib/events/log-reference-matched'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { withTiming } from '@/lib/observability/timing'
import { log } from '@/lib/observability/logger'
import {
  enrichEmbedQueryForExactCompany,
  mergeMatchHitsByMaxSimilarity,
} from '@/lib/match/lexical-reference-match'
import {
  applyClientSideStructuralFilters,
  sortMatchesBySimilarityDesc,
} from '@/lib/match/match-hit-helpers'
import { rerankMatchHitsWithGpt } from '@/lib/match/match-rerank'
import type {
  MatchReferenceHit,
  MatchReferencesOptions,
  MatchReferencesResult,
} from '@/lib/match/match-types'
import {
  attachCompanyFields,
  attachProjectDates,
} from '@/lib/references/library/match-enrich'
import { fetchLexicalReferenceHits } from '@/lib/references/library/match-lexical'
import { browseRecentReferences } from '@/lib/references/library/match-browse'

// Kalibriert an der tatsächlichen Embedding-Skala des Bestands: inhaltlich
// verwandte Referenzen erreichen doc-zu-doc nur ~0,55–0,59, echte (kürzere)
// Suchanfragen liegen darunter. 0,7/0,65 filterte praktisch alles weg → 0 Treffer.
// 0,35 + Top-N-Limit (match_count) liefert die besten Treffer, filtert klaren Lärm.
const MATCH_DEFAULT_THRESHOLD = 0.35
const MATCH_DEFAULT_COUNT = 10

/**
 * Semantische Referenz-Suche: Freitext → Embedding → `match_references` (nur eigene Organisation).
 * Zusätzlich lexikalisch über Account-Name/Titel (kurze Marken-Queries wie „Arla“).
 * Optional `dealId`: Deal-Kontext (Titel, Branche, Volumen) wird dem Suchtext vorangestellt.
 */
export async function matchReferencesImpl(
  input: string,
  dealId?: string,
  options?: MatchReferencesOptions,
): Promise<MatchReferencesResult> {
  const raw = input?.trim() ?? ''

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Nicht angemeldet.' }
  }

  const visibility = await loadReferenceVisibilityForUser(supabase, user.id)
  if (!visibility) {
    return { success: false, error: 'Keine Organisation zugeordnet.' }
  }

  const orgId = visibility.organizationId
  const salesVisibleOnly = visibility.salesVisibleOnly
  const matchCount = options?.matchCount ?? MATCH_DEFAULT_COUNT
  const needsOverFetch =
    typeof options?.filters?.minVolume === 'number' ||
    typeof options?.filters?.maxVolume === 'number' ||
    Boolean(options?.filters?.createdBefore) ||
    Boolean(options?.filters?.volumeBands?.length) ||
    Boolean(options?.filters?.monthsBackList?.length) ||
    Boolean(options?.filters?.excludeCreatedYears?.length) ||
    Boolean(options?.filters?.excludeIndustries?.length) ||
    Boolean(options?.filters?.excludeTerms?.length)
  const fetchCount = needsOverFetch
    ? Math.min(Math.max(matchCount * 4, 24), 50)
    : matchCount

  // Leere Anfrage = Browse: neueste Referenzen der Org (kein Embedding-Score).
  if (!raw) {
    return browseRecentReferences(supabase, {
      orgId,
      salesVisibleOnly,
      matchCount: fetchCount,
      filters: options?.filters,
      dealId: dealId ?? null,
    })
  }

  const apiKey = process.env.OPENAI_API_KEY

  let dealContext: {
    title: string | null
    industry: string | null
    volume: string | null
  } | null = null
  if (dealId) {
    const { data: deal, error: dealErr } = await supabase
      .from('deals')
      .select('id, title, industry, volume')
      .eq('id', dealId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (dealErr || !deal) {
      return { success: false, error: 'Deal nicht gefunden oder keine Berechtigung.' }
    }
    dealContext = {
      title: deal.title,
      industry: deal.industry,
      volume: deal.volume,
    }
  }

  const totalStart = performance.now()

  // Lexikalisch zuerst (schnell): Account-Suchen (Arla, BMW, …) die rein semantisch
  // oft unter dem Cosine-Threshold liegen.
  const lexicalHits = await fetchLexicalReferenceHits(supabase, {
    orgId,
    query: raw,
    salesVisibleOnly,
    matchCount: Math.min(Math.max(fetchCount, 12), 40),
    filters: options?.filters,
  })

  if (!apiKey) {
    if (lexicalHits.length > 0) {
      return {
        success: true,
        matches: await attachCompanyFields(
          supabase,
          sortMatchesBySimilarityDesc(
            applyClientSideStructuralFilters(lexicalHits, options?.filters),
          ).slice(0, matchCount),
        ),
      }
    }
    return {
      success: false,
      error: 'OpenAI API ist nicht konfiguriert (OPENAI_API_KEY).',
    }
  }
  const lexicalCompanyNames = [
    ...new Set(
      lexicalHits
        .map((h) => h.companyName?.trim())
        .filter((n): n is string => Boolean(n)),
    ),
  ]

  const enrichedRaw = enrichEmbedQueryForExactCompany(raw, lexicalCompanyNames)
  let queryText = enrichedRaw
  if (dealContext) {
    const parts = [
      dealContext.title ? `Deal: ${dealContext.title}` : null,
      dealContext.industry
        ? `Branche: ${formatIndustryDisplay(dealContext.industry)}`
        : null,
      dealContext.volume ? `Volumen: ${dealContext.volume}` : null,
      `Anfrage:\n${enrichedRaw}`,
    ].filter(Boolean)
    queryText = parts.join('\n')
  }

  const embeddingStart = performance.now()
  const emb = await embedTextWithOpenAICached(apiKey, queryText)
  const embeddingMs = Math.round(performance.now() - embeddingStart)
  if ('error' in emb) {
    if (lexicalHits.length > 0) {
      const fallback = sortMatchesBySimilarityDesc(
        applyClientSideStructuralFilters(lexicalHits, options?.filters),
      ).slice(0, matchCount)
      return { success: true, matches: await attachCompanyFields(supabase, fallback) }
    }
    return { success: false, error: emb.error }
  }
  log.info('match.embedding', {
    label: 'match.embedding',
    ms: embeddingMs,
    cacheHit: emb.cacheHit,
    organizationId: orgId,
  })
  const embedding = emb.embedding

  const matchThreshold = options?.matchThreshold ?? MATCH_DEFAULT_THRESHOLD

  const { result: rpcResult, ms: rpcMs } = await withTiming(
    'match.rpc',
    () =>
      rpcMatchReferences(supabase, {
        queryEmbedding: embedding,
        matchThreshold,
        matchCount: fetchCount,
        organizationId: orgId,
        salesVisibleOnly,
        // Volumen nur clientseitig (volume_eur ist Freitext, SQL-Ziffernstrip zu ungenau).
        filters: options?.filters
          ? {
              ...options.filters,
              minVolume: null,
              maxVolume: null,
            }
          : undefined,
      }),
    { organizationId: orgId },
  )
  const { rows: list, error: rpcError } = rpcResult

  if (rpcError) {
    if (lexicalHits.length > 0) {
      const fallback = sortMatchesBySimilarityDesc(
        applyClientSideStructuralFilters(lexicalHits, options?.filters),
      ).slice(0, matchCount)
      return { success: true, matches: await attachCompanyFields(supabase, fallback) }
    }
    return { success: false, error: rpcError }
  }

  let matches: MatchReferenceHit[] = list.map((r) => {
    const summary = r.summary?.trim() ?? null
    const snippet = snippetFromSummary(summary, r.title)
    const volRaw = r.volume_eur?.trim() ?? null
    return {
      id: r.id,
      title: r.title ?? '',
      summary,
      industry: r.industry ?? null,
      similarity: typeof r.similarity === 'number' ? r.similarity : 0,
      snippet,
      companyName: r.company_name?.trim() ? r.company_name : null,
      volumeEur: volRaw && volRaw.length > 0 ? volRaw : null,
      status: r.status ?? null,
      createdAt: r.created_at ?? null,
    }
  })

  matches = mergeMatchHitsByMaxSimilarity(matches, lexicalHits)

  if (options?.rerank && matches.length > 1) {
    const { result: reranked } = await withTiming(
      'match.rerank',
      () => rerankMatchHitsWithGpt(apiKey, queryText, matches),
      { organizationId: orgId, resultCount: matches.length },
    )
    matches = reranked
  }

  // Projektzeiten vor Datumsfiltern anreichern (RPC liefert sie nicht).
  matches = await attachProjectDates(supabase, matches)
  matches = applyClientSideStructuralFilters(matches, options?.filters)

  // Score-Ranking für die UI: bestes Match zuerst (auch nach optionalem Rerank).
  matches = sortMatchesBySimilarityDesc(matches).slice(0, matchCount)

  matches = await attachCompanyFields(supabase, matches)

  const totalMs = Math.round(performance.now() - totalStart)
  log.info('match.total', {
    label: 'match.total',
    ms: totalMs,
    organizationId: orgId,
    resultCount: matches.length,
    embeddingMs,
    rpcMs,
  })

  void logReferenceMatched({
    organizationId: orgId,
    matchedReferenceIds: matches.map((m) => m.id),
    source: dealId ? 'deal_context' : 'match_page',
    dealId: dealId ?? null,
    rerank: Boolean(options?.rerank),
    matchThreshold,
    durationMs: totalMs,
  })

  return { success: true, matches }
}

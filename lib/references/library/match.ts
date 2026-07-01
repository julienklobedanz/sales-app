'use server'

import { loadReferenceVisibilityForUser } from '@/lib/roles/load-reference-visibility'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { embedTextWithOpenAICached } from '@/lib/embeddings/cached-embed-query'
import { rpcMatchReferences } from '@/lib/match-references-rpc'
import { snippetFromSummary } from '@/lib/match-reference-snippet'
import { logReferenceMatched } from '@/lib/events/log-reference-matched'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { withTiming } from '@/lib/observability/timing'
import { log } from '@/lib/observability/logger'

import type {
  MatchReferenceHit,
  MatchReferencesOptions,
  MatchReferencesResult,
} from '@/app/dashboard/actions'

// Kalibriert an der tatsächlichen Embedding-Skala des Bestands: inhaltlich
// verwandte Referenzen erreichen doc-zu-doc nur ~0,55–0,59, echte (kürzere)
// Suchanfragen liegen darunter. 0,7/0,65 filterte praktisch alles weg → 0 Treffer.
// 0,35 + Top-N-Limit (match_count) liefert die besten Treffer, filtert klaren Lärm.
const MATCH_DEFAULT_THRESHOLD = 0.35
const MATCH_DEFAULT_COUNT = 10
const RERANK_MODEL = 'gpt-4o-mini'
const RERANK_FETCH_MS = 8000

/**
 * Semantische Referenz-Suche: Freitext → Embedding → `match_references` (nur eigene Organisation).
 * Optional `dealId`: Deal-Kontext (Titel, Branche, Volumen) wird dem Suchtext vorangestellt.
 */
export async function matchReferencesImpl(
  input: string,
  dealId?: string,
  options?: MatchReferencesOptions
): Promise<MatchReferencesResult> {
  const raw = input?.trim() ?? ''
  if (!raw) {
    return { success: false, error: 'Bitte eine Suchanfrage eingeben.' }
  }

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

  let queryText = raw

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

    const parts = [
      deal.title ? `Deal: ${deal.title}` : null,
      deal.industry ? `Branche: ${formatIndustryDisplay(deal.industry)}` : null,
      deal.volume ? `Volumen: ${deal.volume}` : null,
      `Anfrage:\n${raw}`,
    ].filter(Boolean)
    queryText = parts.join('\n')
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'OpenAI API ist nicht konfiguriert (OPENAI_API_KEY).' }
  }

  const totalStart = performance.now()

  const embeddingStart = performance.now()
  const emb = await embedTextWithOpenAICached(apiKey, queryText)
  const embeddingMs = Math.round(performance.now() - embeddingStart)
  if ('error' in emb) {
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
  const matchCount = options?.matchCount ?? MATCH_DEFAULT_COUNT

  const { result: rpcResult, ms: rpcMs } = await withTiming(
    'match.rpc',
    () =>
      rpcMatchReferences(supabase, {
        queryEmbedding: embedding,
        matchThreshold,
        matchCount,
        organizationId: orgId,
        salesVisibleOnly,
        filters: options?.filters,
      }),
    { organizationId: orgId }
  )
  const { rows: list, error: rpcError } = rpcResult

  if (rpcError) {
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

  if (options?.rerank && matches.length > 1) {
    const { result: reranked } = await withTiming(
      'match.rerank',
      () => rerankMatchHitsWithGpt(apiKey, queryText, matches),
      { organizationId: orgId, resultCount: matches.length }
    )
    matches = reranked
  }

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

/**
 * GPT-4o-mini: liefert sortierte UUID-Reihenfolge; fehlende/extra IDs werden robust gemappt.
 */
async function rerankMatchHitsWithGpt(
  apiKey: string,
  queryText: string,
  hits: MatchReferenceHit[]
): Promise<MatchReferenceHit[]> {
  const byId = new Map(hits.map((h) => [h.id, h]))
  const candidates = hits.map((h) => ({
    id: h.id,
    title: h.title.slice(0, 220),
    snippet: h.snippet.slice(0, 320),
  }))

  const prompt = `Du sortierst Referenz-Kandidaten für den Vertrieb nach inhaltlicher Relevanz zur folgenden Suchanfrage bzw. zum Kontext. Die wichtigste Referenz zuerst.

Kontext / Anfrage:
${queryText.slice(0, 4000)}

Kandidaten (nur diese IDs verwenden):
${JSON.stringify(candidates)}

Antworte NUR mit einem JSON-Objekt exakt in dieser Form, ohne Markdown:
{"ordered_ids":["<uuid>", "..."]}

Alle IDs aus den Kandidaten müssen genau einmal vorkommen.`

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), RERANK_FETCH_MS)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: RERANK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      return hits
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? ''
    const parsed = parseOrderedIdsFromGptJson(raw)
    if (!parsed?.length) {
      return hits
    }

    const seen = new Set<string>()
    const ordered: MatchReferenceHit[] = []
    for (const id of parsed) {
      const hit = byId.get(id)
      if (hit && !seen.has(id)) {
        seen.add(id)
        ordered.push(hit)
      }
    }
    for (const h of hits) {
      if (!seen.has(h.id)) ordered.push(h)
    }
    return ordered
  } catch {
    return hits
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

/** Extrahiert ordered_ids aus Rohtext (inkl. ```json-Fence). */
function parseOrderedIdsFromGptJson(raw: string): string[] | null {
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) s = fence[1].trim()
  try {
    const obj = JSON.parse(s) as { ordered_ids?: unknown }
    const ids = obj?.ordered_ids
    if (!Array.isArray(ids)) return null
    return ids.map((x) => String(x).trim()).filter(Boolean)
  } catch {
    return null
  }
}


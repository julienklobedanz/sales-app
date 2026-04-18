import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { embedTextWithOpenAI } from '@/lib/embeddings-openai'
import { rpcMatchReferences } from '@/lib/match-references-rpc'

import type { ExtractedRfpRequirement } from '@/lib/rfp-requirements'

const MATCH_THRESHOLD = 0.55
const MATCH_COUNT = 8
const EMBED_CONCURRENCY = 4

export type RfpCoverageMatch = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  similarity: number
  companyName: string | null
}

export type RfpCoverageRow = {
  requirementId: string
  requirementText: string
  category?: string
  matches: RfpCoverageMatch[]
  embedError?: string
}

type DealContext = {
  title: string | null
  industry: string | null
  volume: string | null
}

function buildQueryText(deal: DealContext | null, requirement: ExtractedRfpRequirement): string {
  const parts = [
    deal?.title ? `Deal: ${deal.title}` : null,
    deal?.industry ? `Branche: ${deal.industry}` : null,
    deal?.volume ? `Volumen: ${deal.volume}` : null,
    requirement.category ? `Kategorie: ${requirement.category}` : null,
    `Anforderung:\n${requirement.text}`,
  ].filter(Boolean)
  return parts.join('\n')
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function run(): Promise<void> {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await worker(items[i], i)
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run())
  await Promise.all(runners)
  return results
}

/**
 * Pro Anforderung: Embedding + `match_references` (org- und rollensicher wie Dashboard-Match).
 */
export async function buildRfpCoverageReport(
  supabase: SupabaseClient,
  params: {
    apiKey: string
    organizationId: string
    salesVisibleOnly: boolean
    deal: DealContext | null
    requirements: ExtractedRfpRequirement[]
  }
): Promise<RfpCoverageRow[]> {
  const { apiKey, organizationId, salesVisibleOnly, deal, requirements } = params

  return mapPool(requirements, EMBED_CONCURRENCY, async (req) => {
    const queryText = buildQueryText(deal, req)
    const emb = await embedTextWithOpenAI(apiKey, queryText)
    if ('error' in emb) {
      return {
        requirementId: req.id,
        requirementText: req.text,
        category: req.category,
        matches: [],
        embedError: emb.error,
      }
    }

    const { rows, error: rpcError } = await rpcMatchReferences(supabase, {
      queryEmbedding: emb.embedding,
      matchThreshold: MATCH_THRESHOLD,
      matchCount: MATCH_COUNT,
      organizationId,
      salesVisibleOnly,
    })

    if (rpcError) {
      return {
        requirementId: req.id,
        requirementText: req.text,
        category: req.category,
        matches: [],
        embedError: rpcError,
      }
    }

    const matches: RfpCoverageMatch[] = rows.map((r) => ({
      id: r.id,
      title: r.title ?? '',
      summary: r.summary,
      industry: r.industry,
      similarity: typeof r.similarity === 'number' ? r.similarity : 0,
      companyName: r.company_name?.trim() ? r.company_name : null,
    }))

    return {
      requirementId: req.id,
      requirementText: req.text,
      category: req.category,
      matches,
    }
  })
}

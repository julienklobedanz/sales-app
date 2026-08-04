import 'server-only'

import { createHash } from 'crypto'
import { unstable_cache } from 'next/cache'

import { embedTextWithOpenAI, OPENAI_EMBEDDING_MODEL } from '@/lib/embeddings-openai'

import { normalizeEmbeddingQueryText } from '@/lib/embeddings/normalize-embedding-query'
function embeddingCacheKeyHash(finalQueryText: string): string {
  const normalized = normalizeEmbeddingQueryText(finalQueryText)
  return createHash('sha256')
    .update(`${OPENAI_EMBEDDING_MODEL}:${normalized}`)
    .digest('hex')
}

export type CachedEmbeddingResult =
  | { embedding: number[]; cacheHit: boolean }
  | { error: string }

/**
 * Embedding mit Cross-Org-Cache: Key = Hash(finaler Text) + Modellname.
 * Org-Filter passiert erst in `match_references`-RPC.
 */
export async function embedTextWithOpenAICached(
  apiKey: string,
  finalQueryText: string,
): Promise<CachedEmbeddingResult> {
  const normalized = normalizeEmbeddingQueryText(finalQueryText)
  if (!normalized) {
    return { error: 'Leerer Text für Embedding.' }
  }

  const keyHash = embeddingCacheKeyHash(finalQueryText)
  const start = performance.now()

  const getCached = unstable_cache(
    async () => embedTextWithOpenAI(apiKey, finalQueryText),
    ['query-embedding', keyHash, OPENAI_EMBEDDING_MODEL],
    { revalidate: false },
  )

  const result = await getCached()
  const ms = Math.round(performance.now() - start)
  const cacheHit = ms < 15

  if ('error' in result) {
    return result
  }

  return { embedding: result.embedding, cacheHit }
}

'use server'

import { resolveSmartMatchConstraints } from '@/lib/match/llm-parse-smart-match-query'
import type { ParsedSmartMatchConstraints } from '@/lib/match/parse-smart-match-query'

/** Server-seitige Query→Filter-Auflösung (Heuristik + optional LLM). */
export async function parseSmartMatchFiltersAction(
  query: string
): Promise<ParsedSmartMatchConstraints> {
  return resolveSmartMatchConstraints(query)
}

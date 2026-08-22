import { logEvent } from '@/lib/events/log-event'

type ReferenceMatchedSource =
  | 'homepage'
  | 'command'
  | 'match_page'
  | 'deal_context'

export type LogReferenceMatchedParams = {
  organizationId: string
  matchedReferenceIds: string[]
  source: ReferenceMatchedSource
  dealId?: string | null
  matchThreshold?: number
  rerank?: boolean
  durationMs?: number
}

/**
 * Zentrales Tracking für semantische Referenz-Matches (`reference_matched`).
 */
export async function logReferenceMatched(
  params: LogReferenceMatchedParams,
): Promise<void> {
  if (params.matchedReferenceIds.length === 0) return

  void logEvent({
    organizationId: params.organizationId,
    eventType: 'reference_matched',
    payload: {
      source: params.source,
      match_count: params.matchedReferenceIds.length,
      has_deal_context: Boolean(params.dealId),
      rerank: Boolean(params.rerank),
      match_threshold: params.matchThreshold ?? null,
      matched_reference_ids: params.matchedReferenceIds,
      ...(params.durationMs !== undefined ? { duration_ms: params.durationMs } : {}),
    },
    dealId: params.dealId ?? null,
    referenceId: null,
  })
}

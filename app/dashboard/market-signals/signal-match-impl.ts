import type { SignalReferenceMatchPayload } from './market-signal-action-types'

/**
 * Semantische „Hochzeit“: Signal-Text → Top-Referenzen aus der Org-Bibliothek.
 * Dedupliziert gleiche Queries; begrenzt Parallelität.
 */
export async function matchReferencesForSignalsImpl(
  signals: SignalReferenceMatchPayload[],
): Promise<
  | {
      success: true
      byKey: Record<
        string,
        import('@/lib/market-signals/signal-reference-match').SignalMatchHit[]
      >
    }
  | { success: false; error: string }
> {
  const list = signals
    .map((s) => ({
      key: String(s.key ?? '').trim(),
      query: String(s.query ?? '').trim(),
      excludeCompanyId: s.excludeCompanyId?.trim() || null,
    }))
    .filter((s) => s.key && s.query.length >= 8)
    .slice(0, 20)

  if (!list.length) {
    return { success: true, byKey: {} }
  }

  const { matchReferencesImpl } = await import('@/lib/references/library/match')
  const { toSignalMatchHit } = await import('@/lib/market-signals/signal-reference-match')

  const uniqueQueries = Array.from(new Set(list.map((s) => s.query)))
  const hitsByQuery = new Map<string, Awaited<ReturnType<typeof matchReferencesImpl>>>()

  const CONCURRENCY = 3
  for (let i = 0; i < uniqueQueries.length; i += CONCURRENCY) {
    const chunk = uniqueQueries.slice(i, i + CONCURRENCY)
    await Promise.all(
      chunk.map(async (query) => {
        const result = await matchReferencesImpl(query, undefined, {
          matchThreshold: 0.35,
          matchCount: 6,
          rerank: false,
        })
        hitsByQuery.set(query, result)
      }),
    )
  }

  const byKey: Record<
    string,
    import('@/lib/market-signals/signal-reference-match').SignalMatchHit[]
  > = {}

  for (const item of list) {
    const result = hitsByQuery.get(item.query)
    if (!result || !result.success) {
      byKey[item.key] = []
      continue
    }
    let hits = result.matches
      .filter(
        (m) =>
          !item.excludeCompanyId || !m.companyId || m.companyId !== item.excludeCompanyId,
      )
      .map(toSignalMatchHit)
    if (hits.length === 0) {
      hits = result.matches.map(toSignalMatchHit)
    }
    byKey[item.key] = hits.slice(0, 3)
  }

  return { success: true, byKey }
}

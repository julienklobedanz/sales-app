export const ENRICHMENT_COLUMN_NAMES = [
  'signal_category',
  'insight_signal_fact',
  'insight_why_now',
] as const

export type MarketSignalEnrichmentColumns = {
  signal_category: string
  insight_signal_fact: string
  insight_why_now: string
}

export function isMissingEnrichmentColumnsError(message: string | undefined): boolean {
  const m = String(message ?? '').toLowerCase()
  return ENRICHMENT_COLUMN_NAMES.some((col) => m.includes(col))
}

export function stripEnrichmentFields<T extends Record<string, unknown>>(row: T): Omit<T, keyof MarketSignalEnrichmentColumns> {
  const { signal_category: _a, insight_signal_fact: _b, insight_why_now: _c, ...rest } = row
  return rest as Omit<T, keyof MarketSignalEnrichmentColumns>
}

import { log, type LogContext } from '@/lib/observability/logger'

export type TimingContext = LogContext & {
  organizationId?: string
  resultCount?: number
}

export type TimingResult<T> = {
  result: T
  ms: number
}

export type TimingPhase = {
  name: string
  ms: number
}

/**
 * Misst die Dauer von `fn`, loggt strukturiert (`label`, `ms`, Kontext) und gibt Ergebnis + Dauer zurück.
 */
export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>,
  context?: TimingContext
): Promise<TimingResult<T>> {
  const start = performance.now()
  const result = await fn()
  const ms = Math.round(performance.now() - start)
  log.info(label, { label, ms, ...context })
  return { result, ms }
}

/** Baut einen `Server-Timing`-Header aus gemessenen Phasen. */
export function buildServerTimingHeader(phases: TimingPhase[]): string {
  return phases.map((p) => `${p.name};dur=${p.ms}`).join(', ')
}

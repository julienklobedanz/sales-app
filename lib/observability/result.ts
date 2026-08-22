import { log } from '@/lib/observability/logger'

/**
 * Kanonische Result-Shape für Server Actions / UI-facing Returns.
 * Siehe docs/ai-coding-agent-guide.md und docs/tech-debt-inventar.md.
 */
export type Result<T> =
  | ({ success: true } & (T extends void ? { data?: never } : { data: T }))
  | { success: false; error: string }

export function ok(): { success: true }
export function ok<T>(data: T): { success: true; data: T }
export function ok<T>(data?: T): { success: true; data?: T } {
  return data === undefined ? { success: true } : { success: true, data }
}

export function err(error: string): { success: false; error: string } {
  return { success: false, error }
}

export function fail(
  message: string,
  context?: Record<string, unknown>,
  cause?: unknown,
): { success: false; error: string } {
  log.error(message, context, cause)
  return { success: false, error: message }
}

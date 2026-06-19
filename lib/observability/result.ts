import { log } from '@/lib/observability/logger'

export type Result<T> = { ok: true; data: T } | { ok: false; error: string }

export function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

export function err<T = never>(error: string): Result<T> {
  return { ok: false, error }
}

export function fail<T = never>(
  message: string,
  context?: Record<string, unknown>,
  cause?: unknown
): Result<T> {
  log.error(message, context, cause)
  return { ok: false, error: message }
}

export function fromThrown(
  message: string,
  context?: Record<string, unknown>
): (cause: unknown) => Result<never> {
  return (cause) => fail(message, context, cause)
}

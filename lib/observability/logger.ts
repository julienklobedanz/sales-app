export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown>

const SENSITIVE_KEY = /password|token|secret|authorization|api[_-]?key|cookie/i

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return '[redacted]'
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return redactObject(value as Record<string, unknown>)
  }
  return value
}

export function redactObject(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    out[key] = redactValue(key, value)
  }
  return out
}

export type LogEntry = {
  level: LogLevel
  message: string
  context?: LogContext
  error?: { name: string; message: string; stack?: string }
  timestamp: string
}

type LogSink = (entry: LogEntry) => void

let sink: LogSink = (entry) => {
  const payload = {
    ...entry,
    context: entry.context ? redactObject(entry.context) : undefined,
  }
  const line = JSON.stringify(payload)
  switch (entry.level) {
    case 'debug':
    case 'info':
      console.log(line)
      break
    case 'warn':
      console.warn(line)
      break
    case 'error':
      console.error(line)
      break
  }
}

/** Später: Vercel Logflare, Sentry o. Ä. hier anbinden. */
export function setLogSink(next: LogSink): void {
  sink = next
}

function toErrorFields(error: unknown): LogEntry['error'] | undefined {
  if (!error) return undefined
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  return { name: 'Error', message: String(error) }
}

function write(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown,
): void {
  sink({
    level,
    message,
    context,
    error: toErrorFields(error),
    timestamp: new Date().toISOString(),
  })
}

export const log = {
  debug(message: string, context?: LogContext) {
    write('debug', message, context)
  },
  info(message: string, context?: LogContext) {
    write('info', message, context)
  },
  warn(message: string, context?: LogContext, error?: unknown) {
    write('warn', message, context, error)
  },
  error(message: string, context?: LogContext, error?: unknown) {
    write('error', message, context, error)
  },
}

import 'server-only'

const BODY_MAX = 320

type OpenAiErrorShape = {
  message?: string
  type?: string
  code?: string
}

export function parseOpenAiErrorJson(raw: string): OpenAiErrorShape {
  try {
    const j = JSON.parse(raw) as { error?: OpenAiErrorShape }
    if (j?.error && typeof j.error === 'object') return j.error
  } catch {
    // kein JSON
  }
  return {}
}

export function isOpenAiQuotaError(status: number, rawBody: string): boolean {
  if (status !== 429 && status !== 402) return false
  const parsed = parseOpenAiErrorJson(rawBody)
  const code = `${parsed.code ?? ''} ${parsed.type ?? ''}`.toLowerCase()
  const msg = (parsed.message ?? rawBody).toLowerCase()
  return (
    code.includes('insufficient_quota') ||
    code.includes('billing') ||
    /exceeded your (current )?quota|billing_hard_limit/i.test(msg)
  )
}

export function isOpenAiQuotaErrorMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('insufficient_quota') ||
    lower.includes('exceeded your current quota') ||
    lower.includes('billing_hard_limit') ||
    (lower.includes('429') && lower.includes('quota')) ||
    (lower.includes('kontingent') && lower.includes('openai'))
  )
}

/**
 * Nutzerfreundliche Meldung aus OpenAI HTTP-Antwort (Chat, Vision, JSON).
 */
export function formatOpenAiHttpError(
  status: number,
  rawBody: string,
  label = 'OpenAI'
): string {
  const body = rawBody.trim()
  const parsed = parseOpenAiErrorJson(body)
  const apiMsg = (parsed.message ?? '').trim()
  const code = `${parsed.code ?? ''} ${parsed.type ?? ''}`.toLowerCase()
  const msgLower = apiMsg.toLowerCase()

  if (status === 401) {
    return `${label}: API-Schlüssel ungültig oder abgelaufen. Bitte OPENAI_API_KEY in .env.local prüfen.`
  }

  if (status === 403) {
    return apiMsg
      ? `${label}: Zugriff verweigert — ${apiMsg}`
      : `${label}: Zugriff verweigert (HTTP 403).`
  }

  if (status === 429 || status === 402) {
    if (isOpenAiQuotaError(status, body)) {
      return `${label}: Nutzungs- oder Billing-Limit erreicht. Bitte Guthaben und Limits unter https://platform.openai.com/account/billing prüfen.`
    }
    if (code.includes('rate_limit') || /rate limit|too many requests/i.test(msgLower)) {
      return `${label}: Anfragelimit kurzfristig erreicht — bitte in ein paar Minuten erneut versuchen.`
    }
    const tail = apiMsg || body.slice(0, BODY_MAX)
    return tail
      ? `${label} (${status}): ${tail}`
      : `${label}: Server meldet HTTP ${status}. Bitte später erneut versuchen.`
  }

  if (apiMsg) return `${label} (${status}): ${apiMsg}`
  if (body) return `${label} (${status}): ${body.slice(0, BODY_MAX)}`
  return `${label}: Unerwartete Antwort (HTTP ${status}).`
}

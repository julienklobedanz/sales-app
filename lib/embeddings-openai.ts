import 'server-only'

const EMBEDDING_MODEL = 'text-embedding-3-small'

const OPENAI_ERROR_BODY_MAX = 320

type OpenAiErrorShape = {
  message?: string
  type?: string
  code?: string
}

function parseOpenAiErrorJson(raw: string): OpenAiErrorShape {
  try {
    const j = JSON.parse(raw) as { error?: OpenAiErrorShape }
    if (j?.error && typeof j.error === 'object') return j.error
  } catch {
    // kein JSON
  }
  return {}
}

/**
 * Lesbare Fehlermeldung aus HTTP-Status und OpenAI-Body (error.code / message).
 */
function formatEmbeddingsApiError(status: number, rawBody: string): string {
  const body = rawBody.trim()
  const parsed = parseOpenAiErrorJson(body)
  const apiMsg = (parsed.message ?? '').trim()
  const code = `${parsed.code ?? ''} ${parsed.type ?? ''}`.toLowerCase()
  const msgLower = apiMsg.toLowerCase()

  if (status === 401) {
    return 'OpenAI hat den API-Schlüssel abgewiesen (ungültig oder abgelaufen). Bitte OPENAI_API_KEY in .env.local prüfen und den Dev-Server neu starten.'
  }

  if (status === 403) {
    return apiMsg
      ? `OpenAI Embeddings nicht erlaubt: ${apiMsg}`
      : 'OpenAI Embeddings: Zugriff verweigert (HTTP 403). Organisation/Projekt-Berechtigungen prüfen.'
  }

  if (status === 429) {
    const isRateLimit =
      code.includes('rate_limit') ||
      code.includes('rate limit') ||
      /rate limit/i.test(apiMsg) ||
      msgLower.includes('too many requests')
    if (isRateLimit) {
      return apiMsg
        ? `OpenAI Embeddings: Anfragelimit kurzfristig erreicht — ${apiMsg}`
        : 'OpenAI Embeddings: Anfragelimit (Rate Limit) kurzfristig erreicht. Bitte etwas warten und erneut versuchen.'
    }
    const isQuota =
      code.includes('insufficient_quota') ||
      code.includes('quota') ||
      /billing_hard_limit|exceeded your (current )?quota/i.test(msgLower)
    if (isQuota) {
      return apiMsg
        ? `OpenAI Embeddings: Kontingent/Billing — ${apiMsg}`
        : 'OpenAI Embeddings: Nutzungs- oder Billing-Limit erreicht. Bitte Limits und Zahlungsmittel im OpenAI-Dashboard prüfen.'
    }
    const tail = apiMsg || body.slice(0, OPENAI_ERROR_BODY_MAX)
    return tail
      ? `OpenAI Embeddings vorübergehend blockiert (HTTP 429): ${tail}`
      : 'OpenAI Embeddings: Server meldet HTTP 429 ohne Details. Bitte später erneut versuchen oder OpenAI-Status prüfen.'
  }

  if (status === 400 && apiMsg) {
    return `OpenAI Embeddings: ${apiMsg}`
  }

  if (apiMsg) {
    return `OpenAI Embeddings (${status}): ${apiMsg}`
  }
  if (body) {
    return `OpenAI Embeddings (${status}): ${body.slice(0, OPENAI_ERROR_BODY_MAX)}`
  }
  return `OpenAI Embeddings: unerwartete Antwort (HTTP ${status}).`
}

export async function embedTextWithOpenAI(
  apiKey: string,
  input: string
): Promise<{ embedding: number[] } | { error: string }> {
  const trimmed = input.trim()
  if (!trimmed) {
    return { error: 'Leerer Text für Embedding.' }
  }

  // text-embedding-3-small: grob ~8k Tokens; konservativer Zeichen-Deckel
  const inputForApi = trimmed.slice(0, 32000)

  try {
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: inputForApi,
      }),
    })

    if (!embRes.ok) {
      const status = embRes.status
      const text = await embRes.text()
      return { error: formatEmbeddingsApiError(status, text) }
    }

    const embJson = (await embRes.json()) as {
      data?: Array<{ embedding?: number[] }>
    }
    const vec = embJson?.data?.[0]?.embedding
    if (!vec?.length) {
      return { error: 'Kein Embedding von OpenAI erhalten.' }
    }
    return { embedding: vec }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler'
    return { error: message }
  }
}

import 'server-only'

const EMBEDDING_MODEL = 'text-embedding-3-small'

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
      if (status === 429) {
        return {
          error:
            'Das Einbettungs-Kontingent ist aktuell ausgeschöpft. Bitte später erneut versuchen.',
        }
      }
      return { error: `OpenAI Embeddings (${status}): ${text.slice(0, 200)}` }
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

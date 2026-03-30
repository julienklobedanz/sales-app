import 'server-only'

const MODEL = 'gpt-4o-mini'
const MAX_RFP_CHARS = 100_000

export type ExtractedRfpRequirement = {
  id: string
  text: string
  category?: string
}

/**
 * Strukturierte Anforderungen aus RFP-Klartext (ohne Vektor-Suche).
 */
export async function extractRequirementsFromRfpText(
  apiKey: string,
  plainText: string
): Promise<{ requirements: ExtractedRfpRequirement[] } | { error: string }> {
  const body = plainText.trim().slice(0, MAX_RFP_CHARS)
  if (body.length < 80) {
    return { error: 'Zu wenig Text für eine Anforderungsanalyse.' }
  }

  const prompt = `Du extrahierst aus einem Ausschreibungs-/RFP-Dokument die wichtigsten fachlichen und technischen Anforderungen.

Regeln:
- Nur echte Anforderungen (müssen/sollten/werden gefordert), keine Floskeln.
- 5 bis 30 Einträge, jeweils ein Satz oder kurzer Absatz.
- Jede Anforderung braucht eine stabile id (kebab-case, z. B. req-hosting-eu).
- category optional: z. B. Security, Hosting, SLA, Compliance, Integration.

Antworte NUR mit JSON exakt in dieser Form (kein Markdown):
{"requirements":[{"id":"...","text":"...","category":"..."}]}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: body },
        ],
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return { error: `OpenAI (${res.status}): ${t.slice(0, 240)}` }
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? ''
    let parsed: { requirements?: unknown }
    try {
      parsed = JSON.parse(raw) as { requirements?: unknown }
    } catch {
      return { error: 'KI-Antwort war kein gültiges JSON.' }
    }

    const reqs = parsed?.requirements
    if (!Array.isArray(reqs) || reqs.length === 0) {
      return { error: 'Keine Anforderungen erkannt.' }
    }

    const requirements: ExtractedRfpRequirement[] = []
    for (const item of reqs) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const id = typeof o.id === 'string' ? o.id.trim() : ''
      const text = typeof o.text === 'string' ? o.text.trim() : ''
      if (!id || !text) continue
      const category =
        typeof o.category === 'string' && o.category.trim()
          ? o.category.trim()
          : undefined
      requirements.push({ id, text, category })
    }

    if (requirements.length === 0) {
      return { error: 'Keine gültigen Anforderungen im JSON.' }
    }

    return { requirements: requirements.slice(0, 35) }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler'
    return { error: message }
  }
}

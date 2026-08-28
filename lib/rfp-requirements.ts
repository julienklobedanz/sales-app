import 'server-only'

import { formatOpenAiHttpError } from '@/lib/openai-api-errors'

const MODEL = 'gpt-4o-mini'
export const MAX_RFP_CHARS = 100_000
const MAX_RFP_REQUIREMENTS = 30
const RFP_REQUIREMENTS_SEED = 1

export type ExtractedRfpRequirement = {
  id: string
  text: string
  category?: string
}

export type RfpInputBounds = {
  inputTruncated: boolean
  inputChars: number
}

/** Länge vor dem Schnitt; `inputTruncated` wenn der Text die Grenze überschreitet. */
export function rfpInputBounds(plainText: string): RfpInputBounds {
  const inputChars = plainText.trim().length
  return {
    inputChars,
    inputTruncated: inputChars > MAX_RFP_CHARS,
  }
}

/**
 * Strukturierte Anforderungen aus RFP-Klartext (ohne Vektor-Suche).
 */
export async function extractRequirementsFromRfpText(
  apiKey: string,
  plainText: string,
): Promise<
  | ({
      requirements: ExtractedRfpRequirement[]
      truncated: boolean
    } & RfpInputBounds)
  | { error: string }
> {
  const bounds = rfpInputBounds(plainText)
  const body = plainText.trim().slice(0, MAX_RFP_CHARS)
  if (body.length < 80) {
    return { error: 'Zu wenig Text für eine Anforderungsanalyse.' }
  }

  const prompt = `Du extrahierst aus einem Ausschreibungs-/RFP-Dokument die wichtigsten fachlichen und technischen Anforderungen.

Regeln:
- Nur echte Anforderungen (müssen/sollten/werden gefordert), keine Floskeln.
- 5 bis ${MAX_RFP_REQUIREMENTS} Einträge, jeweils ein Satz oder kurzer Absatz.
- Der text ist der Wortlaut aus dem Dokument, nicht seine Zusammenfassung. Kein Kürzen, kein Umformulieren, kein Vereinheitlichen der Satzform. Zusammengehörige Sätze dürfen zusammen übernommen werden, aber ungeschrieben.
- Falsch: „Der Auftragnehmer muss einen qualifizierten Objektleiter einsetzen …“
- Richtig: „Der Auftragnehmer setzt einen qualifizierten Objektleiter ein …“
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
        temperature: 0,
        // temperature: 0 ist gierige Auswahl, nicht Reproduzierbarkeit; ohne seed variiert der Anbieter.
        seed: RFP_REQUIREMENTS_SEED,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return { error: formatOpenAiHttpError(res.status, t, 'Anforderungs-Analyse') }
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

    const truncated = requirements.length > MAX_RFP_REQUIREMENTS
    return {
      requirements: requirements.slice(0, MAX_RFP_REQUIREMENTS),
      truncated,
      ...bounds,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler'
    return { error: message }
  }
}

import 'server-only'

import { formatOpenAiHttpError } from '@/lib/openai-api-errors'

import {
  parseEligibilityCriteriaResponse,
  type EligibilityCriterion,
} from './eligibility-criteria-schema'

const MODEL = 'gpt-4o-mini'
const MAX_RFP_CHARS = 100_000

const EXTRACT_PROMPT = `Du extrahierst aus einem Ausschreibungs-/RFP-Dokument **quantifizierte Eignungs- und K.O.-Kriterien** für Bieter.

Regeln:
- Nur harte oder klar messbare Schwellen (z. B. Mindest-Mitarbeiterzahl, Mindestumsatz, Zertifizierungen, Referenzanzahl, Region).
- Keine allgemeinen Floskeln ohne messbaren Wert.
- dimension: employee_count | annual_revenue | reference_count | certification | region | other
- operator: gte | lte | eq | contains
- value: Zahl (z. B. 500 für Mitarbeiter, 50000000 für 50 Mio EUR Umsatz) oder Text (z. B. "ISO 27001", "DACH")
- mandatory: true wenn explizit K.O./Ausschlusskriterium, sonst false
- confidence: high | medium | low — wie eindeutig die Schwelle im Text steht
- evidence: kurzes Zitat aus dem Text (optional)
- 0 bis 12 Einträge

Antworte NUR mit JSON exakt in dieser Form (kein Markdown):
{"criteria":[{"id":"...","dimension":"...","label":"...","operator":"gte","value":500,"unit":"MA","mandatory":true,"confidence":"high","evidence":"..."}]}`

/**
 * Strukturierte K.O.-Kriterien aus RFP-Klartext (LLM).
 */
export async function extractEligibilityCriteriaFromRfpText(
  apiKey: string,
  plainText: string,
): Promise<{ criteria: EligibilityCriterion[] } | { error: string }> {
  const body = plainText.trim().slice(0, MAX_RFP_CHARS)
  if (body.length < 80) {
    return { criteria: [] }
  }

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
          { role: 'system', content: EXTRACT_PROMPT },
          { role: 'user', content: body },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return { error: formatOpenAiHttpError(res.status, t, 'Eignungs-Kriterien') }
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { error: 'KI-Antwort war kein gültiges JSON.' }
    }

    const criteria = parseEligibilityCriteriaResponse(parsed)
    return { criteria }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler'
    return { error: message }
  }
}

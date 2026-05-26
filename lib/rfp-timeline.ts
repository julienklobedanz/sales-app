import 'server-only'

import { formatOpenAiHttpError } from '@/lib/openai-api-errors'
import type { DealDeskTimelineItem } from '@/lib/deal-desk/mock-analysis'

const MODEL = 'gpt-4o-mini'
const MAX_RFP_CHARS = 100_000
const MAX_ITEMS = 8

function isIsoDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/**
 * Extrahiert konkrete Fristen/Deadlines aus dem RFP-Text.
 * (MVP: nur Items, bei denen ein konkretes Datum erkennbar ist.)
 */
export async function extractTimelineFromRfpText(
  apiKey: string,
  plainText: string
): Promise<{ timelineItems: DealDeskTimelineItem[] } | { error: string }> {
  const body = plainText.trim().slice(0, MAX_RFP_CHARS)
  if (body.length < 80) {
    return { timelineItems: [] }
  }

  const prompt = `Du extrahierst aus einem Ausschreibungs-/RFP-Dokument relevante Fristen/Deadlines für den Bid-Prozess.

Regeln:
- NUR JSON (kein Markdown).
- Antworte exakt mit dieser Form:
{"timelineItems":[{"id":"...","title":"...","dueDate":"YYYY-MM-DD","evidence":string|null}]}
- dueDate NUR, wenn im Text ein konkretes Datum inkl. Jahr erkennbar ist. (Dann als ISO YYYY-MM-DD ausgeben.)
- Maximal ${MAX_ITEMS} Einträge.
- "title" kurz und auf Deutsch (z. B. "Angebotsabgabe", "Rückfragenfrist").
- evidence: kurzer Beleg/Zitat aus dem Text oder null, falls kein kurzer Beleg möglich ist.

Wenn keine konkreten Daten erkennbar sind: timelineItems = []`

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
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return { error: formatOpenAiHttpError(res.status, t, 'Timeline-Analyse') }
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? ''
    let parsed: { timelineItems?: unknown }
    try {
      parsed = JSON.parse(raw) as { timelineItems?: unknown }
    } catch {
      return { error: 'KI-Antwort war kein gültiges JSON.' }
    }

    const items = parsed.timelineItems
    if (!Array.isArray(items)) return { timelineItems: [] }

    const timelineItems: DealDeskTimelineItem[] = []
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const id = typeof o.id === 'string' ? o.id.trim() : ''
      const title = typeof o.title === 'string' ? o.title.trim() : ''
      const dueDate = o.dueDate
      const evidence =
        o.evidence === null || typeof o.evidence === 'string'
          ? (o.evidence as string | null)
          : null

      if (!id || !title || !isIsoDate(dueDate)) continue
      timelineItems.push({ id, title, dueDate, evidence: evidence ?? null })
    }

    return { timelineItems }
  } catch {
    return { error: 'Timeline konnte nicht ausgelesen werden.' }
  }
}


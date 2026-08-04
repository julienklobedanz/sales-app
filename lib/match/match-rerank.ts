import type { MatchReferenceHit } from '@/lib/match/match-types'
import { parseOrderedIdsFromGptJson } from '@/lib/match/match-hit-helpers'

const RERANK_MODEL = 'gpt-4o-mini'
const RERANK_FETCH_MS = 8000

/**
 * GPT-4o-mini: liefert sortierte UUID-Reihenfolge; fehlende/extra IDs werden robust gemappt.
 */
export async function rerankMatchHitsWithGpt(
  apiKey: string,
  queryText: string,
  hits: MatchReferenceHit[]
): Promise<MatchReferenceHit[]> {
  const byId = new Map(hits.map((h) => [h.id, h]))
  const candidates = hits.map((h) => ({
    id: h.id,
    title: h.title.slice(0, 220),
    snippet: h.snippet.slice(0, 320),
  }))

  const prompt = `Du sortierst Referenz-Kandidaten für den Vertrieb nach inhaltlicher Relevanz zur folgenden Suchanfrage bzw. zum Kontext. Die wichtigste Referenz zuerst.

Kontext / Anfrage:
${queryText.slice(0, 4000)}

Kandidaten (nur diese IDs verwenden):
${JSON.stringify(candidates)}

Antworte NUR mit einem JSON-Objekt exakt in dieser Form, ohne Markdown:
{"ordered_ids":["<uuid>", "..."]}

Alle IDs aus den Kandidaten müssen genau einmal vorkommen.`

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), RERANK_FETCH_MS)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: RERANK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      return hits
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? ''
    const parsed = parseOrderedIdsFromGptJson(raw)
    if (!parsed?.length) {
      return hits
    }

    const seen = new Set<string>()
    const ordered: MatchReferenceHit[] = []
    for (const id of parsed) {
      const hit = byId.get(id)
      if (hit && !seen.has(id)) {
        seen.add(id)
        ordered.push(hit)
      }
    }
    for (const h of hits) {
      if (!seen.has(h.id)) ordered.push(h)
    }
    return ordered
  } catch {
    return hits
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

import 'server-only'

/**
 * LLM-Relevanz-Verdikt für RFP-Coverage (Ehrlichkeitsschicht).
 *
 * Cosinus-Ähnlichkeit allein trennt schwach-echte Treffer nicht sauber von Rauschen
 * (gestauchtes Embedding-Band). gpt-4o-mini beurteilt je Anforderung, ob eine der
 * Kandidaten-Referenzen sie inhaltlich WIRKLICH abdeckt — so wird „Apple" für
 * „Post-Quantum-Kryptografie" korrekt als „none" erkannt, auch bei 44 %.
 */

const MODEL = 'gpt-4o-mini'
const FETCH_MS = 20000

type RfpVerdictValue = 'covers' | 'partial' | 'none'
export type RfpVerdict = {
  verdict: RfpVerdictValue
  /** Vom LLM als am besten passend gewählte Referenz (kann von der Top-Similarity abweichen). */
  chosenId: string | null
  reason: string
}

type Candidate = { id: string; title: string; summary: string | null }
export type RfpRelevanceItem = {
  requirementId: string
  requirementText: string
  candidates: Candidate[]
}

/**
 * Ein Batch-Aufruf für alle Anforderungen. Bei Fehler/Timeout: leere Map
 * (der Aufrufer fällt dann auf die Similarity-Stufen zurück).
 */
export async function judgeRfpRelevance(
  apiKey: string,
  items: RfpRelevanceItem[],
): Promise<Record<string, RfpVerdict>> {
  const usable = items.filter((it) => it.candidates.length > 0)
  if (usable.length === 0) return {}

  const payload = usable.map((it) => ({
    requirementId: it.requirementId,
    requirement: it.requirementText.slice(0, 400),
    candidates: it.candidates.slice(0, 3).map((c) => ({
      id: c.id,
      title: c.title.slice(0, 160),
      summary: (c.summary ?? '').slice(0, 320),
    })),
  }))

  const prompt = `Du bist Bid-Manager und prüfst, ob vorhandene Referenzprojekte die Anforderungen einer Ausschreibung inhaltlich abdecken.

Für JEDE Anforderung: beurteile die Kandidaten-Referenzen und entscheide:
- "covers": eine Referenz belegt die Anforderung inhaltlich wirklich.
- "partial": nur angrenzend/teilweise passend, aber nicht voll belegend.
- "none": keine der Referenzen passt inhaltlich (auch wenn Stichworte ähneln).
Wähle "chosenId" = die am besten passende Referenz-id (bei "none": null). Begründung "reason": max 12 Wörter, deutsch.

Daten (nur diese ids verwenden):
${JSON.stringify(payload)}

Antworte NUR mit JSON, ohne Markdown:
{"verdicts":[{"requirementId":"...","verdict":"covers|partial|none","chosenId":"...|null","reason":"..."}]}`

  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), FETCH_MS)
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) return {}
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? ''
    return parseVerdicts(raw)
  } catch {
    return {}
  } finally {
    if (timeout !== undefined) clearTimeout(timeout)
  }
}

function parseVerdicts(raw: string): Record<string, RfpVerdict> {
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) s = fence[1].trim()
  try {
    const obj = JSON.parse(s) as { verdicts?: unknown }
    const list = Array.isArray(obj?.verdicts) ? obj.verdicts : []
    const out: Record<string, RfpVerdict> = {}
    for (const v of list) {
      const row = v as Record<string, unknown>
      const id = typeof row.requirementId === 'string' ? row.requirementId : null
      const verdict = row.verdict
      if (!id || (verdict !== 'covers' && verdict !== 'partial' && verdict !== 'none'))
        continue
      out[id] = {
        verdict,
        chosenId: typeof row.chosenId === 'string' ? row.chosenId : null,
        reason: typeof row.reason === 'string' ? row.reason : '',
      }
    }
    return out
  } catch {
    return {}
  }
}

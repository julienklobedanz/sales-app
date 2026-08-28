import 'server-only'

import { formatOpenAiHttpError } from '@/lib/openai-api-errors'
import {
  extractSubmissionItemsByPattern,
  mergeSubmissionItems,
} from '@/lib/deals/extract-submission-items-pattern'
import {
  parseSubmissionItemsResponse,
  type ExtractedSubmissionItem,
} from '@/lib/deals/submission-items-schema'

const MODEL = 'gpt-4o-mini'
const MAX_RFP_CHARS = 100_000
const SUBMISSION_ITEMS_SEED = 1

const EXTRACT_PROMPT = `Du extrahierst aus einem Ausschreibungs-/RFP-Dokument die Soll-Liste der Einreichung.

Gesucht sind ausschließlich Unterlagen, die **der Bieter einreichen muss** — Formulare, Erklärungen und Nachweise, die zum Teilnahmeantrag oder zum Angebot gehören.

**Nicht** gesucht sind Anlagen, die der Auftraggeber beilegt oder bereitstellt: Leistungsbeschreibungen, Raumbücher, Preisblätter zur Information, technische Anhänge.

Das unterscheidende Merkmal ist, **woran** die Anlage hängt: an der Abgabe des Bieters oder am Beschreibungsteil des Auftraggebers.

**Lässt sich nicht sicher entscheiden, ob es eine Bieter-Unterlage ist oder eine Anlage des Auftraggebers, gib sie nicht aus.** Unsichere Bieter-Formulare (ungewöhnliche Zeilenform) darfst du vorschlagen — die Person bestätigt. Auftraggeber-Anlagen wie C-02 gehören nicht auf die Liste.

Beispielpaar:
- Ja: Anlage A9 „Referenzliste“ — gehört zum Teilnahmeantrag
- Nein: Anlage C-02.3 „Reinigungszeiten und Ansprechpartner“ — gehört zur Leistungsbeschreibung des Auftraggebers

Weitere Regeln:
- identifier: die Kennung wie im Dokument (A1, A6a, 221) oder null, wenn keine Nummer steht.
- title: der Titel der Anlage, möglichst wortgleich, ohne das Wort Anlage/Anhang davor.
- 0 Treffer ist gültig, wenn das Dokument keine solche Liste enthält. Erfinde nichts.
- Die Kopfzeile „Anlagen A1 bis A10“ oder „nebst Anlagen A1 bis A10“ ist **keine** Position.
- Bedingungen, wann etwas entfällt, nicht extrahieren. Kein state-Feld.

Antworte NUR mit JSON exakt in dieser Form (kein Markdown):
{"items":[{"identifier":"A1","title":"Bewerbungsbogen"}]}`

/**
 * Soll-Liste der Einreichung: Muster zuerst, Modell als Abdeckung.
 */
export async function extractSubmissionItemsFromRfpText(
  apiKey: string,
  plainText: string,
): Promise<{ items: ExtractedSubmissionItem[] } | { error: string }> {
  const body = plainText.trim().slice(0, MAX_RFP_CHARS)
  const patternItems = extractSubmissionItemsByPattern(body)
  if (body.length < 80) {
    return { items: mergeSubmissionItems(patternItems, []) }
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
        temperature: 0,
        // temperature: 0 ist gierige Auswahl, nicht Reproduzierbarkeit; ohne seed variiert der Anbieter.
        seed: SUBMISSION_ITEMS_SEED,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return { error: formatOpenAiHttpError(res.status, t, 'Einreichungs-Positionen') }
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

    const modelItems = parseSubmissionItemsResponse(parsed)
    return { items: mergeSubmissionItems(patternItems, modelItems) }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler'
    return { error: message }
  }
}

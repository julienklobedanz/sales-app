import 'server-only'

import {
  BENCHMARK_RISK_CRITERION_IDS,
  buildBenchmarkRiskAnalysis,
  isBenchmarkRiskCriterionId,
  type BenchmarkRiskAnalysis,
  type BenchmarkRiskHit,
} from '@/lib/deal-desk/benchmark-risk'
import { formatOpenAiHttpError } from '@/lib/openai-api-errors'

const MODEL = 'gpt-4o-mini'
const MAX_CHARS = 80_000

const CRITERION_PROMPT = BENCHMARK_RISK_CRITERION_IDS.map((id) => {
  switch (id) {
    case 'no_contact_rule':
      return `- no_contact_rule (KO +30%): Direkter Kontakt/Austausch mit Fachexperten/Nutzern untersagt; Fragen nur anonym über Einkaufsportal.`
    case 'incumbent_spec_sheet':
      return `- incumbent_spec_sheet (KO +30%): Feature-Liste/Architektur >80% identisch mit geschützten Produktbegriffen eines Incumbents (Copy-Paste-Lastenheft).`
    case 'aggressive_deadline':
      return `- aggressive_deadline (stark +20%): Bearbeitungszeit für komplexe Enterprise-Ausschreibung unrealistisch kurz (< 10 Tage bis Abgabe).`
    case 'extreme_price_focus':
      return `- extreme_price_focus (stark +20%): Preiskomponente in Vergabekriterien mit >70% gewichtet.`
    case 'price_matrix_vs_content':
      return `- price_matrix_vs_content (stark +20%): Excel-Preismatrix extrem detailliert/atomisiert, Pain Points in Leistungsbeschreibung vage/generisch.`
    case 'budgetary_quote_only':
      return `- budgetary_quote_only (schwach +10%): Explizite Richtpreis-/Budgetary-Quote-Anfrage ohne konkretes Go-Live-Datum.`
    case 'unconditional_terms':
      return `- unconditional_terms (schwach +10%): Abweichungen von Einkaufsbedingungen führen zum sofortigen Ausschluss.`
    case 'recycled_old_document':
      return `- recycled_old_document (schwach +10%): Veraltete Jahreszahlen oder abgelaufene Deadlines (recycelte Vorlage).`
    default:
      return `- ${id}`
  }
}).join('\n')

export async function analyzeBenchmarkRisk(
  apiKey: string,
  plainText: string,
  documentFileNames: string[] = []
): Promise<BenchmarkRiskAnalysis | { error: string }> {
  const body = plainText.trim().slice(0, MAX_CHARS)
  if (body.length < 80) {
    return buildBenchmarkRiskAnalysis([])
  }

  const fileList =
    documentFileNames.length > 0
      ? `\nHochgeladene Dateien:\n${documentFileNames.map((n) => `- ${n}`).join('\n')}`
      : ''

  const prompt = `Du analysierst ein RFP/Ausschreibungspaket auf Benchmark-/Show-Tender-Risiko (Ausschreibung nur zur Preisabfrage ohne echte Vergabeabsicht).

Antworte NUR mit JSON (kein Markdown):
{
  "hits": [
    {
      "id": "<exakte ID aus der Liste>",
      "detected": true,
      "evidence": "<kurze Begründung oder Textauszug auf Deutsch>"
    }
  ]
}
${fileList}

Prüfe NUR diese Kriterien — detected nur bei klarer/textlicher Evidenz:
${CRITERION_PROMPT}

Regeln:
- Nur Treffer mit detected: true in hits aufnehmen.
- id exakt wie oben (snake_case).
- Keine erfundenen Treffer — lieber weniger als zu viele.
- evidence: 1 Satz, konkret.`

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
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return { error: formatOpenAiHttpError(res.status, t, 'Benchmark-Risiko-Analyse') }
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? ''
    const parsed = JSON.parse(raw) as Record<string, unknown>

    const hits: BenchmarkRiskHit[] = []
    if (Array.isArray(parsed.hits)) {
      for (const item of parsed.hits) {
        if (!item || typeof item !== 'object') continue
        const o = item as Record<string, unknown>
        if (o.detected !== true) continue
        const id = typeof o.id === 'string' ? o.id.trim() : ''
        if (!isBenchmarkRiskCriterionId(id)) continue
        const evidence =
          typeof o.evidence === 'string' && o.evidence.trim() ? o.evidence.trim() : null
        hits.push({ id, evidence })
      }
    }

    return buildBenchmarkRiskAnalysis(hits)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Benchmark-Risiko-Analyse fehlgeschlagen.' }
  }
}

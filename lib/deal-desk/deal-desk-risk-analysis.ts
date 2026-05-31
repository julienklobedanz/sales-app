import 'server-only'

import type { DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import { formatOpenAiHttpError } from '@/lib/openai-api-errors'

const MODEL = 'gpt-4o-mini'
const MAX_CHARS = 80_000

export type DealDeskRiskAnalysisResult = {
  icpFitLabel: string
  icpSummary: string
  customerName: string
  redFlags: DealDeskRedFlag[]
}

export async function analyzeDealDeskRisks(
  apiKey: string,
  plainText: string,
  projectName: string,
  documentFileNames: string[] = []
): Promise<DealDeskRiskAnalysisResult | { error: string }> {
  const body = plainText.trim().slice(0, MAX_CHARS)
  if (body.length < 80) {
    return {
      icpFitLabel: 'Unklar',
      icpSummary: 'Zu wenig Text für eine belastbare Einschätzung.',
      customerName: projectName,
      redFlags: [],
    }
  }

  const fileList =
    documentFileNames.length > 0
      ? `\nHochgeladene Dateien (sourceFileName exakt aus dieser Liste wählen):\n${documentFileNames.map((n) => `- ${n}`).join('\n')}`
      : ''

  const prompt = `Du analysierst ein RFP/Ausschreibungspaket für eine Go/No-Bid-Entscheidung.

Antworte NUR mit JSON (kein Markdown):
{
  "icpFitLabel": "<kurz, z.B. Starker ICP-Fit>",
  "icpSummary": "<2-4 Sätze Deutsch — strategische Passung, Branche, Volumen; KEIN Prozent-Score>",
  "customerName": "<Auftraggeber/Kunde aus Text oder "${projectName}">",
  "redFlags": [
    {
      "id": "rf-1",
      "severity": "critical|high|medium",
      "title": "...",
      "excerpt": "<wörtliche oder paraphrasierte Risikopassage>",
      "pageHint": "<optional Kap./Anhang/§>",
      "sourceFileName": "<exakter Dateiname aus der Liste oder null>"
    }
  ]
}
${fileList}

Regeln:
- 3 bis 8 redFlags, nur echte Vertrags-/SLA-/Haftungs-/Compliance-Risiken.
- sourceFileName: das Dokument (Vertrag, Anhang, Leistungsbeschreibung), in dem die Klausel steht.
- Kein winProbability-Feld — Score wird separat aus Referenzen und Nachweisen berechnet.`

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
        temperature: 0.25,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return { error: formatOpenAiHttpError(res.status, t, 'Risiko-Analyse') }
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? ''
    const parsed = JSON.parse(raw) as Record<string, unknown>

    const icpFitLabel =
      typeof parsed.icpFitLabel === 'string' ? parsed.icpFitLabel.trim() : 'ICP prüfen'
    const icpSummary =
      typeof parsed.icpSummary === 'string' ? parsed.icpSummary.trim() : ''
    const customerName =
      typeof parsed.customerName === 'string' && parsed.customerName.trim()
        ? parsed.customerName.trim()
        : projectName

    const redFlags: DealDeskRedFlag[] = []
    if (Array.isArray(parsed.redFlags)) {
      let i = 0
      for (const item of parsed.redFlags) {
        if (!item || typeof item !== 'object') continue
        const o = item as Record<string, unknown>
        const title = typeof o.title === 'string' ? o.title.trim() : ''
        const excerpt = typeof o.excerpt === 'string' ? o.excerpt.trim() : ''
        if (!title || !excerpt) continue
        const sev = o.severity
        const severity =
          sev === 'critical' || sev === 'high' || sev === 'medium' ? sev : 'medium'
        const sourceFileName =
          typeof o.sourceFileName === 'string' && o.sourceFileName.trim()
            ? o.sourceFileName.trim()
            : null
        redFlags.push({
          id: typeof o.id === 'string' ? o.id : `rf-${++i}`,
          severity,
          title,
          excerpt,
          pageHint: typeof o.pageHint === 'string' ? o.pageHint : undefined,
          sourceFileName,
          sourceDocumentId: null,
          markedForLegal: false,
        })
      }
    }

    return { icpFitLabel, icpSummary, customerName, redFlags }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Risikoanalyse fehlgeschlagen.' }
  }
}

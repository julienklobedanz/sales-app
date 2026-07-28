import 'server-only'

import {
  normalizeExecutiveBriefingFields,
  type DealDeskExecutiveBriefingFields,
} from '@/lib/deal-desk/executive-briefing-fields'
import { normalizeTenderLots, type TenderLot } from '@/lib/deals/tender-lots'
import { formatOpenAiHttpError } from '@/lib/openai-api-errors'

const MODEL = 'gpt-4o-mini'
const MAX_CHARS = 80_000

export type ExecutiveBriefingExtractSuccess = {
  briefing: DealDeskExecutiveBriefingFields
  tenderLots: TenderLot[]
}

export async function extractExecutiveBriefingFromRfp(
  apiKey: string,
  plainText: string,
  projectName: string
): Promise<ExecutiveBriefingExtractSuccess | { error: string }> {
  const body = plainText.trim().slice(0, MAX_CHARS)
  if (body.length < 80) {
    return { briefing: { ...normalizeExecutiveBriefingFields(null) }, tenderLots: [] }
  }

  const prompt = `Du extrahierst aus einem RFP/Ausschreibungspaket Felder für ein internes EXECUTIVE BRIEFING (Deutsch).

Projekt-Kontext: "${projectName}"

Antworte NUR mit JSON (kein Markdown):
{
  "submissionDeadline": "<Abgabedatum/Angebotsfrist, z.B. 19.06.2026 oder null>",
  "desiredServiceStart": "<gewünschter Projekt-/Servicebeginn oder null>",
  "expectedDealVolume": "<erwartetes Deal-Volumen/TCV inkl. Laufzeit, z.B. ca. 1.2M € TCV (36 Monate) oder null>",
  "bidInvestment": "<Bid-Aufwand, z.B. Mittel (5 Personentage Presales) oder null>",
  "strategicAssessment": "<2-4 Sätze strategische Go/No-Bid-Einschätzung aus dem Dokument>",
  "techFocus": "<Tech-Fokus/Scope-Kern, z.B. Cloud-Migration AWS/Azure + SAP>",
  "governance": "<Compliance/Governance, z.B. ISO 27001, Datenhaltung CH>",
  "economicDecisionMaker": "<wirtschaftlicher Entscheider mit Rolle/Titel wenn im Text>",
  "competition": "<Wettbewerb/Mitbewerber-Hinweise aus Formulierungen>",
  "ourLeverage": "<Hebel/Referenzen/Alleinstellungsmerkmale wenn erwähnt oder ableitbar>",
  "tenderProcedure": "<Ablauf: Upload, Shortlist, Präsentation etc.>",
  "keyTakeaways": ["<3-5 kurze Bullet-Punkte für Management>"],
  "capabilityRisks": [
    {
      "kind": "critical|high|delivery",
      "title": "<Kurztitel>",
      "detail": "<1-2 Sätze oder Zitat-Auszug>"
    }
  ],
  "domainTags": ["<3-10 Domänen-Tags, z.B. Dienstleistungen, EU-Ausschreibung, Cybersicherheit, KRITIS>"],
  "projectLocation": "<kompakter Standort, z.B. Stuttgart, DE oder Remote / CH oder null>",
  "bidderRequirements": ["<Zertifizierungen, Haftpflicht, Referenzen an den Bieter>"],
  "roleQualifications": ["<Sprachkenntnisse, Rollen, KRITIS-Erfahrung der Projektteilnehmer>"],
  "specialConditions": ["<Datenhaltung EU/EWR, Mindestlohn, Laufzeit, Bietergemeinschaft etc.>"],
  "projectOverviewPlain": "<2-4 Sätze neutrale Projektübersicht für eine Notice-Seite, ohne Go/No-Bid>",
  "tenderLots": [
    {
      "lotId": "<LOT-0001 oder null>",
      "title": "<Los-Titel>",
      "description": "<Kurzbeschreibung des Loses>",
      "estimatedValueEur": <Zahl oder null>,
      "estimatedValueText": "<geschätzter Wert als Text falls keine Zahl, z.B. 25.000.000 € oder null>"
    }
  ]
}

Regeln:
- Nur Inhalte aus dem Dokument; bei fehlenden Infos null bzw. leere Arrays.
- Daten im Format TT.MM.JJJJ wenn im Text erkennbar.
- capabilityRisks: Vertrags-/SLA-/Haftungsrisiken (critical/high) plus ggf. delivery bei knappem Start/Ressourcen.
- keyTakeaways: prägnant, für Vorstand/E-Mail.
- domainTags: thematische Klassifizierung (keine Duplikate).
- projectLocation: Stadt + Land-Kürzel wenn erkennbar, sonst null.
- bidderRequirements / roleQualifications / specialConditions: je 0-8 kurze Bullet-Strings aus dem Text.`

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
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return { error: formatOpenAiHttpError(res.status, t, 'Executive Briefing') }
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json?.choices?.[0]?.message?.content?.trim() ?? ''
    const parsed = JSON.parse(raw) as unknown
    return {
      briefing: normalizeExecutiveBriefingFields(parsed),
      tenderLots: normalizeTenderLots(parsed),
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Executive-Briefing-Extraktion fehlgeschlagen.' }
  }
}

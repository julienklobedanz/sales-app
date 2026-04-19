/** Epic 5: Ausgabeformate für KI-Entwurf (Wireframe §15). */
export type KiEntwurfOutputFormat = 'email_snippet' | 'proposal_passage' | 'elevator_pitch'

export type KiEntwurfTone = 'professional' | 'casual' | 'formal'

export type KiEntwurfReferencePayload = {
  title: string
  summary: string | null
  customerChallenge: string | null
  ourSolution: string | null
  industry: string | null
  companyName: string | null
}

const FORMAT_INSTRUCTIONS: Record<KiEntwurfOutputFormat, string> = {
  email_snippet:
    'Format: **E-Mail-Snippet** (Anschreiben-Charakter). Anrede optional, 1 kurzer Absatz Fließtext, professioneller Abschluss. Keine Bullet-Listen, keine Betreff-Zeile erzwingen.',
  proposal_passage:
    'Format: **Angebots-Passage** – ein zusammenhängender Absatz für ein Angebot oder eine RFP-Antwort. Nutzen und Referenz stützen, ohne Marketing-Floskeln zu übertreiben.',
  elevator_pitch:
    'Format: **Elevator Pitch** – **genau drei Sätze**, nacheinander nummeriert implizit nur durch Zeilenumbruch (keine „1.“-Liste), maximal prägnant.',
}

const TONE_INSTRUCTIONS: Record<KiEntwurfTone, string> = {
  professional:
    'Tonalität: **Professionell** – Siezen, sachlich, vertrauenswürdig, typisch B2B-Vertrieb.',
  casual:
    'Tonalität: **Locker** – freundlich und zugänglich, Du ist erlaubt wo natürlich; trotzdem respektvoll.',
  formal:
    'Tonalität: **Formell** – sehr höflich, konservativ, Amts- bzw. Vorstandstauglich.',
}

/**
 * Baut den Nutzer-Prompt für GPT-4o (Deutsch, nur Fließtext-Ausgabe).
 */
export function buildKiEntwurfUserPrompt(params: {
  reference: KiEntwurfReferencePayload
  matchScore: number
  outputFormat: KiEntwurfOutputFormat
  tone: KiEntwurfTone
  additionalContext?: string | null
  dealContext?: string | null
}): string {
  const { reference, matchScore, outputFormat, tone, additionalContext, dealContext } = params
  const scorePct = Math.round(Math.min(1, Math.max(0, matchScore)) * 100)

  const parts = [
    'Du schreibst für einen Vertriebsmitarbeiter einer IT-/Beratungsorganisation. Antworte **nur** mit dem gewünschten Entwurfstext auf Deutsch, ohne Meta-Kommentare und ohne Markdown-Überschriften mit #.',
    FORMAT_INSTRUCTIONS[outputFormat],
    TONE_INSTRUCTIONS[tone],
    '',
    `Semantischer Match-Score dieser Referenz zur aktuellen Suche: **${scorePct} %** (nur als Hinweis für Relevanz, nicht im Text wiederholen, außer es passt natürlich).`,
    '',
    '### Referenz (Inhalt)',
    `Titel: ${reference.title}`,
    reference.companyName ? `Account / Kunde: ${reference.companyName}` : null,
    reference.industry ? `Branche: ${reference.industry}` : null,
    reference.summary ? `Kurzbeschreibung:\n${reference.summary}` : null,
    reference.customerChallenge ? `Herausforderung des Kunden:\n${reference.customerChallenge}` : null,
    reference.ourSolution ? `Unsere Lösung:\n${reference.ourSolution}` : null,
    dealContext?.trim() ? `### Deal-Kontext\n${dealContext.trim()}` : null,
    additionalContext?.trim() ? `### Zusätzliche Vorgaben vom Nutzer\n${additionalContext.trim()}` : null,
  ]

  return parts.filter(Boolean).join('\n\n')
}

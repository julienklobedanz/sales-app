export type IntroTone = 'challenging' | 'advisory' | 'concise'

export type OutreachDraftInput = {
  headline: string
  signalKind: 'exec' | 'news'
  companyName: string
  introTone: IntroTone
  summarySnippet: string
  referenceTitles: string[]
  recipientFullName?: string | null
  senderFullName?: string | null
}

const DEFAULT_CLOSING = 'Vielen Dank im Voraus und beste Grüße,'

/** Exactly one blank line after greeting, two blank lines before closing, name directly under closing. */
export function formatOutreachEmail(parts: {
  greeting: string
  body: string
  closing?: string
  senderFullName: string
}): string {
  const greeting = parts.greeting.trim()
  const body = parts.body.trim().replace(/\n{3,}/g, '\n\n')
  const closing = (parts.closing?.trim() || DEFAULT_CLOSING).replace(/,?\s*$/, ',')
  const sender = parts.senderFullName.trim() || '[Ihr Name]'
  return `${greeting}\n\n${body}\n\n\n${closing}\n${sender}`
}

function recipientLastName(fullName: string | null | undefined): string | null {
  const trimmed = String(fullName ?? '').trim()
  if (!trimmed) return null
  const parts = trimmed.split(/\s+/).filter(Boolean)
  return parts.length ? parts[parts.length - 1]! : null
}

function buildOutreachGreeting(
  recipientFullName: string | null | undefined,
): string {
  const last = recipientLastName(recipientFullName)
  if (!last) return 'Guten Tag [Name],'
  return `Guten Tag Herr/Frau ${last},`
}

function toneBodyStyle(introTone: IntroTone): { lead: string; cta: string } {
  if (introTone === 'challenging') {
    return {
      lead: 'Meine Hypothese:',
      cta: 'Passt das zu Ihrer aktuellen Priorität — oder sehen Sie den Hebel woanders?',
    }
  }
  if (introTone === 'concise') {
    return {
      lead: 'Kurz zum Anlass:',
      cta: 'Hätten Sie 15 Minuten für einen Abgleich diese Woche?',
    }
  }
  return {
    lead: 'Aus unserer Sicht:',
    cta: 'Gerne tausche ich mich kurz mit Ihnen aus, welche Schritte bei Ihnen gerade Sinn ergeben.',
  }
}

function signalAngle(input: OutreachDraftInput): string {
  const low = input.summarySnippet.toLowerCase()
  if (/budget|kost|einspar|effizienz|spar|kosten/.test(low)) {
    return 'Budget- und Effizienzthemen scheinen bei Ihnen im Fokus zu stehen'
  }
  if (/cloud|migration|modernis|digital|transformation/.test(low)) {
    return 'Modernisierung und Plattform-/Cloud-Themen prägen das Umfeld'
  }
  if (/security|cyber|ciso|risiko|compliance/.test(low)) {
    return 'Security-, Risiko- und Compliance-Themen sind erkennbar relevant'
  }
  if (/expansion|wachstum|m&a|übernahme|neue märkte/.test(low)) {
    return 'Wachstum und Expansion prägen die aktuelle Agenda'
  }
  if (input.signalKind === 'exec') {
    return 'der Fokus auf die ersten 90 Tage neuer Führungsrollen oft ein Fenster für Infrastruktur- und Anbieterentscheidungen eröffnet'
  }
  return 'operativer Veränderungsbedarf beim Account das Gespräch verdient'
}

export function buildHeuristicOutreachDraft(input: OutreachDraftInput): string {
  const angle = signalAngle(input)
  const { lead, cta } = toneBodyStyle(input.introTone)
  const company = input.companyName.trim() || 'Ihrem Unternehmen'
  const signalRef = input.headline.trim()
    ? ` (${input.headline.trim().slice(0, 120)}${input.headline.length > 120 ? '…' : ''})`
    : ''

  // Proof-Sätze zu Referenzen hängen clientseitig per Checkbox an — hier nur Basis-Entwurf.
  const body = [
    `${lead} Aufgrund des aktuellen Signals bei ${company}${signalRef} sehe ich, dass ${angle}.`,
    `${input.summarySnippet.trim().slice(0, 280)}${input.summarySnippet.length > 280 ? '…' : ''}`,
    cta,
  ]
    .filter(Boolean)
    .join('\n\n')

  return formatOutreachEmail({
    greeting: buildOutreachGreeting(input.recipientFullName),
    body,
    senderFullName: input.senderFullName ?? '[Ihr Name]',
  })
}

/** Normalize model output to the required email structure. */
export function normalizeOutreachDraftText(
  raw: string,
  fallback: OutreachDraftInput,
): string {
  const trimmed = raw.trim()
  if (!trimmed) return buildHeuristicOutreachDraft(fallback)

  const lines = trimmed.split(/\r?\n/)
  const nonEmpty = lines.map((l) => l.trim()).filter((l) => l.length > 0)
  if (nonEmpty.length < 2) {
    return formatOutreachEmail({
      greeting: buildOutreachGreeting(fallback.recipientFullName),
      body: trimmed,
      senderFullName: fallback.senderFullName ?? '[Ihr Name]',
    })
  }

  const greeting = nonEmpty[0]!
  const closingIdx = nonEmpty.findIndex(
    (l, i) => i > 0 && /grüße|gruesse|vielen dank|freundliche/i.test(l),
  )
  let closing = DEFAULT_CLOSING
  let sender = fallback.senderFullName?.trim() || '[Ihr Name]'
  let bodyLines: string[]

  if (closingIdx >= 0) {
    closing = nonEmpty[closingIdx]!
    bodyLines = nonEmpty.slice(1, closingIdx)
    if (closingIdx + 1 < nonEmpty.length) {
      sender = nonEmpty.slice(closingIdx + 1).join(' ')
    }
  } else {
    bodyLines = nonEmpty.slice(1)
    if (
      bodyLines.length > 1 &&
      bodyLines[bodyLines.length - 1]!.split(/\s+/).length <= 4
    ) {
      sender = bodyLines.pop()!
    }
  }

  const body = bodyLines.join('\n\n').trim() || trimmed
  return formatOutreachEmail({
    greeting: greeting.endsWith(',') ? greeting : `${greeting},`,
    body,
    closing,
    senderFullName: sender,
  })
}

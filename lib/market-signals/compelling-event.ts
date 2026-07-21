/**
 * Kürzt Fließtext auf max. ~2 Zeilen, endet immer mit einem ganzen Satz — nie mit „…“.
 */
export function truncateToCompleteSentences(
  raw: string | null | undefined,
  maxChars = 180
): string | null {
  const s = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return null

  const withTerminal = /[.!?…]["')\]]*$/.test(s) ? s : `${s}.`
  if (withTerminal.length <= maxChars) return withTerminal

  const parts = withTerminal.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)
  const sentences = (parts ?? [withTerminal])
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (/[.!?…]["')\]]*$/.test(part) ? part : `${part}.`))

  if (!sentences.length) return withTerminal

  let result = ''
  for (const sentence of sentences) {
    const next = result ? `${result} ${sentence}` : sentence
    if (next.length <= maxChars) {
      result = next
      continue
    }
    break
  }

  // Erster Satz komplett behalten, auch wenn länger als maxChars — kein Mitten-Schnitt.
  return result || sentences[0]!
}

/** Alte Heuristik-Boilerplates aus der Anzeige entfernen (DB kann noch Altlasten haben). */
const BOILERPLATE_SUFFIXES = [
  /\s*Das erhöht kurzfristig den Bedarf an einem klaren Business Case für unsere Cloud-Infrastruktur-Lösung\.?/gi,
  /\s*Neue Entscheider evaluieren in den ersten 90 Tagen oft bestehende Dienstleister und unsere Cloud-Infrastruktur-Lösung\.?/gi,
  /\s*In den ersten 90 Tagen entstehen oft neue Prioritäten für unsere Cloud-Infrastruktur-Lösung\.?/gi,
  /\s*Zeitfenster, unsere Cloud-Infrastruktur-Lösung zu platzieren, bevor die Budgetplanung schließt\.?/gi,
]

const BOILERPLATE_ONLY = [
  /^Veränderung bei .+ erhöht kurzfristig den Bedarf an belastbaren Referenzen für unsere Cloud-Infrastruktur-Lösung\.?$/i,
]

/**
 * Für UI „Compelling Event“: kürzen + Alt-Boilerplate strippen.
 * Leerer/ungenügender Text → null (Zeile ausblenden).
 */
export function sanitizeCompellingEventForDisplay(
  raw: string | null | undefined,
  maxChars = 180
): string | null {
  let s = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return null

  for (const re of BOILERPLATE_SUFFIXES) {
    s = s.replace(re, '').trim()
  }
  for (const re of BOILERPLATE_ONLY) {
    if (re.test(s)) return null
  }

  // Generisches Exec-Template ohne konkreten Headline-Inhalt
  if (
    /\bwechselt auf den neue Führungsrolle-Posten\b/i.test(s) ||
    /\bwechselt auf den eine neue Führungsrolle-Posten\b/i.test(s)
  ) {
    return null
  }

  const truncated = truncateToCompleteSentences(s, maxChars)
  if (!truncated || truncated.replace(/[.!?]\s*$/, '').trim().length < 12) return null
  return truncated
}

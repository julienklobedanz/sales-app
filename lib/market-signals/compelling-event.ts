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

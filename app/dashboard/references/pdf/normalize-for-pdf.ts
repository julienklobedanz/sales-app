/**
 * Entfernt künstliche Zeilenumbrüche (z. B. aus Bento-/Narrow-Layouts), behält echte Absätze.
 * @react-pdf/renderer bricht bei jedem \n — ohne Normalisierung bleibt rechts viel Whitespace.
 */
export function normalizeTextForPdfFlow(value: string | null | undefined): string {
  if (value == null || !String(value).trim()) return ''
  return String(value)
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
}

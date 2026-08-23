/** Kleinschreiben, Akzente entfernen, auf Wortzeichen reduzieren. */
export function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Generiert einen lesbaren Slug im Google-Meet-Format: xxx-xxxx-xxx
 * (3 Zeichen - 4 Zeichen - 3 Zeichen, nur Kleinbuchstaben)
 */
const CHARS = 'abcdefghjkmnpqrstuvwxyz' // ohne i, l, o (Verwechslung)

function randomSegment(length: number): string {
  let s = ''
  for (let i = 0; i < length; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return s
}

export function generatePortfolioSlug(): string {
  return `${randomSegment(3)}-${randomSegment(4)}-${randomSegment(3)}`
}

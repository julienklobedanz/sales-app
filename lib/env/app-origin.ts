/**
 * Normalisiert `NEXT_PUBLIC_APP_URL` zu einer vollständigen Origin (inkl. Protokoll) und
 * sorgt für einen klaren Fehler statt "stillschweigendem" `localhost`-Fallback in Prod.
 */
export function getAppOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (!raw) {
    const isProd =
      process.env.VERCEL_ENV === 'production' ||
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_APP_URL === undefined
    if (isProd) {
      throw new Error(
        'NEXT_PUBLIC_APP_URL ist nicht gesetzt. Bitte in der Zielumgebung (Staging/Prod) konfigurieren.',
      )
    }
    return 'http://localhost:3000'
  }

  const normalized = raw.replace(/\/$/, '')
  if (/^https?:\/\//i.test(normalized)) return normalized
  return `https://${normalized}`
}

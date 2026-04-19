/** Anzeige der Website im Formular (ohne Schema-Präfix). */
export function displayHostFromUrl(url: string | null | undefined): string {
  if (!url) return ''
  const u = url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  return u.split('/')[0] ?? u
}

export function normalizeWebsiteForSave(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t.replace(/^www\./i, '')}`
}

function sanitizeSharedUrl(url: string) {
  return url.replace(/\[([^\]]+)\]/g, '$1').replace(/\[|\]/g, '')
}

export function toAbsoluteUrl(url: string) {
  const clean = sanitizeSharedUrl(url)
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean
  if (typeof window === 'undefined') return clean
  return new URL(clean, window.location.origin).toString()
}

export function buildManageUrl(absolutePublicUrl: string, manageToken: string): string {
  const u = new URL(absolutePublicUrl)
  u.searchParams.set('manage', manageToken)
  u.searchParams.set('mode', 'revoke')
  return u.toString()
}

export function generateClientPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(14)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i]! % alphabet.length]
  }
  return out
}

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function defaultExpiryDateInput(): string {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return toDateInputValue(d.toISOString())
}

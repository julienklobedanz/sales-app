export function firstNameFromFullName(fullName: string | null | undefined): string {
  const trimmed = (fullName ?? '').trim()
  if (!trimmed) return 'du'
  return trimmed.split(/\s+/)[0] ?? 'du'
}

export function relativeTimeDe(isoOrAt: number, nowMs = Date.now()): string {
  const t = typeof isoOrAt === 'number' ? isoOrAt : new Date(isoOrAt).getTime()
  if (!Number.isFinite(t)) return 'gerade'
  const diffMin = Math.max(1, Math.round((nowMs - t) / 60000))
  if (diffMin < 60) return `vor ${diffMin} Min.`
  const hours = Math.round(diffMin / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.round(hours / 24)
  if (days < 7) return `vor ${days} Tg.`
  return new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

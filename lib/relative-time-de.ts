/** Kurze relative Zeitangabe für UI (de-DE). */
export function formatRelativeTimeDe(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diffMs = Date.now() - t
  const sec = Math.floor(diffMs / 1000)
  if (sec < 45) return 'gerade eben'
  const min = Math.floor(sec / 60)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} Min.`
  const h = Math.floor(min / 60)
  if (h < 24) return `vor ${h} Std.`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} Tag${d === 1 ? '' : 'en'}`
  const w = Math.floor(d / 7)
  if (w < 5) return `vor ${w} Woche${w === 1 ? '' : 'n'}`
  const m = Math.floor(d / 30)
  if (m < 12) return `vor ${m} Monat${m === 1 ? '' : 'en'}`
  const y = Math.floor(d / 365)
  return `vor ${y} Jahr${y === 1 ? '' : 'en'}`
}

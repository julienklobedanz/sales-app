export function normalizeNarrativeText(input: string | null | undefined): string | null {
  const raw = String(input ?? '').replace(/\r\n/g, '\n').trim()
  if (!raw) return null

  const lines = raw
    .split('\n')
    .map((line) =>
      line
        .trim()
        .replace(/^[-*•]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .replace(/\s{2,}/g, ' ')
    )
    .filter(Boolean)

  const units = (lines.length > 1 ? lines : [raw])
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const deduped: string[] = []
  for (const unit of units) {
    const key = unit.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(unit)
  }

  const combined = deduped.join(' ').replace(/\s{2,}/g, ' ').trim()
  return combined || null
}


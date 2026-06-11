function collapseWrappedLine(line: string, continuation: string): string {
  const left = line.trim()
  const right = continuation.trim()
  if (!left) return right
  if (!right) return left
  if (left.endsWith('-')) return `${left}${right}`
  return `${left} ${right}`
}

/** Öffentliche Referenz-Ansicht: harte Import-Umbrüche in Fließtext/Bullets zusammenziehen. */
export function formatShowcaseNarrativeForDisplay(input: string | null | undefined): string {
  const raw = String(input ?? '').replace(/\r\n/g, '\n').trim()
  if (!raw) return ''

  const paragraphs = raw.split(/\n\s*\n/)
  const normalized = paragraphs
    .map((paragraph) => {
      const lines = paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      if (!lines.length) return ''

      const isBulletBlock = lines.every((line) => /^[-*•]\s/.test(line) || /^\d+[.)]\s/.test(line))
      if (isBulletBlock) {
        return lines
          .map((line) =>
            line
              .replace(/^[-*•]\s+/, '• ')
              .replace(/^\d+[.)]\s+/, '• ')
              .replace(/\s{2,}/g, ' ')
          )
          .join('\n')
      }

      let merged = lines[0] ?? ''
      for (let i = 1; i < lines.length; i += 1) {
        const line = lines[i] ?? ''
        if (/^[-*•]\s/.test(line) || /^\d+[.)]\s/.test(line)) {
          merged += `\n${line.replace(/^[-*•]\s+/, '• ').replace(/^\d+[.)]\s+/, '• ')}`
        } else {
          merged = collapseWrappedLine(merged, line)
        }
      }
      return merged.replace(/\s{2,}/g, ' ').trim()
    })
    .filter(Boolean)

  return normalized.join('\n\n')
}

export function parseShowcaseBulletItems(input: string): string[] | null {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return null

  const items: string[] = []
  let current = ''

  for (const line of lines) {
    const bulletMatch = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/)
    if (bulletMatch) {
      if (current) items.push(current)
      current = bulletMatch[1].trim()
      continue
    }
    if (!current) return null
    current = collapseWrappedLine(current, line)
  }

  if (current) items.push(current)
  return items.length ? items : null
}

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


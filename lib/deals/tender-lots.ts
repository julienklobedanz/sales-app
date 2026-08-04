export type TenderLot = {
  lotId: string | null
  title: string
  description: string | null
  estimatedValueEur: number | null
  estimatedValueText: string | null
}

export function normalizeTenderLots(raw: unknown): TenderLot[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as Record<string, unknown>
  const src = o.tenderLots
  if (!Array.isArray(src)) return []
  const out: TenderLot[] = []
  for (const item of src) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    if (!title) continue
    const lotId =
      typeof row.lotId === 'string' && row.lotId.trim() ? row.lotId.trim() : null
    const description =
      typeof row.description === 'string' && row.description.trim()
        ? row.description.trim()
        : null
    let estimatedValueEur: number | null = null
    if (
      typeof row.estimatedValueEur === 'number' &&
      Number.isFinite(row.estimatedValueEur)
    ) {
      estimatedValueEur = row.estimatedValueEur
    }
    const estimatedValueText =
      typeof row.estimatedValueText === 'string' && row.estimatedValueText.trim()
        ? row.estimatedValueText.trim()
        : null
    out.push({ lotId, title, description, estimatedValueEur, estimatedValueText })
  }
  return out
}

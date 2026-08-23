import { normalizeToken } from '@/lib/deals/normalize-token'

type DealRfpRequirementStatus = 'aktiv' | 'entfallen'

export type ExistingDealRfpRequirement = {
  id: string
  normalizedText: string
  status: DealRfpRequirementStatus
}

type ExtractedDealRfpRequirementInput = {
  text: string
  category?: string | null
}

type DealRfpRequirementInsert = {
  text: string
  normalizedText: string
  category: string | null
}

type DealRfpRequirementReconcilePlan = {
  insert: DealRfpRequirementInsert[]
  keepIds: string[]
  dropIds: string[]
}

/**
 * Mappt Bestand und neue Extraktion auf bleibt / neu / entfallen.
 * Schlüssel ist normalizeToken(text), nicht die LLM-id.
 */
export function reconcileDealRfpRequirements(
  existing: ExistingDealRfpRequirement[],
  extracted: ExtractedDealRfpRequirementInput[],
): DealRfpRequirementReconcilePlan {
  const byNormalized = new Map<string, ExistingDealRfpRequirement>()
  for (const row of existing) {
    if (!row.normalizedText || byNormalized.has(row.normalizedText)) continue
    byNormalized.set(row.normalizedText, row)
  }

  const insert: DealRfpRequirementInsert[] = []
  const keepIds: string[] = []
  const seenExtracted = new Set<string>()

  for (const item of extracted) {
    const normalizedText = normalizeToken(item.text)
    if (!normalizedText || seenExtracted.has(normalizedText)) continue
    seenExtracted.add(normalizedText)

    const match = byNormalized.get(normalizedText)
    if (match) {
      keepIds.push(match.id)
    } else {
      insert.push({
        text: item.text.trim(),
        normalizedText,
        category: item.category?.trim() ? item.category.trim() : null,
      })
    }
  }

  const dropIds: string[] = []
  for (const row of existing) {
    if (row.status !== 'aktiv') continue
    if (seenExtracted.has(row.normalizedText)) continue
    dropIds.push(row.id)
  }

  return { insert, keepIds, dropIds }
}

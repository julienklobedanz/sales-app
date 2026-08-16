/** Welche Felder der Referenz-Kern je Surface zeigt — macht §10.4 prüfbar. */

export type ReferenceContentSurface = 'internal' | 'reduced'

export const REFERENCE_CONTENT_FIELD_IDS = [
  'summary',
  'usabilityStatement',
  'competitorBlacklist',
  'challenge',
  'solution',
  'volume',
  'contractType',
  'projectStart',
  'projectEnd',
  'incumbentProvider',
  'competitors',
  'customerContact',
  'salesContact',
  'files',
] as const

export type ReferenceContentFieldId = (typeof REFERENCE_CONTENT_FIELD_IDS)[number]

export const REFERENCE_CONTENT_REDUCED_FIELDS: readonly ReferenceContentFieldId[] = [
  'summary',
  'challenge',
  'solution',
]

export const REFERENCE_CONTENT_HISTORY_FIELDS = ['createdAt', 'updatedAt'] as const

export type ReferenceContentFile = {
  key: string
  name: string
  href?: string | null
  category: 'sales' | 'contract' | 'other' | null
  createdAt?: string | null
  assetId?: string | null
}

export type ReferenceContentFieldValues = {
  summary?: string | null
  usabilityStatement?: string | null
  competitorBlacklist?: readonly string[] | null
  challenge?: string | null
  solution?: string | null
  volume?: string | null
  contractType?: string | null
  projectStart?: string | null
  projectEnd?: string | null
  incumbentProvider?: string | null
  competitors?: string | null
  customerContact?: string | null
  salesContact?: string | null
  files?: readonly unknown[] | null
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function isFieldFilled(
  id: ReferenceContentFieldId,
  values: ReferenceContentFieldValues,
): boolean {
  if (id === 'competitorBlacklist') {
    return (values.competitorBlacklist ?? []).some((item) => String(item).trim())
  }
  if (id === 'files') {
    return Array.isArray(values.files) && values.files.length > 0
  }
  return hasText(values[id] as string | null | undefined)
}

/**
 * Sichtbare Kernfelder. `isSalesView` ändert nichts — die Sperrliste gilt für jede Rolle.
 * Historie ist kein Kernfeld und erscheint nie.
 */
export function visibleReferenceContentFields(
  surface: ReferenceContentSurface,
  values: ReferenceContentFieldValues,
): ReferenceContentFieldId[] {
  const allowed =
    surface === 'reduced'
      ? REFERENCE_CONTENT_REDUCED_FIELDS
      : REFERENCE_CONTENT_FIELD_IDS
  return allowed.filter((id) => isFieldFilled(id, values))
}

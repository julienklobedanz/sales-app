/** SME-Tasks tragen `sme-${requirementId}` — nach Persist ist das die Zeilen-UUID. */
export function requirementIdForSmeTask(
  smeTaskId: string,
  requirementIds: ReadonlySet<string>,
): string | null {
  if (requirementIds.has(smeTaskId)) return smeTaskId
  if (smeTaskId.startsWith('sme-')) {
    const rest = smeTaskId.slice('sme-'.length)
    if (requirementIds.has(rest)) return rest
  }
  return null
}

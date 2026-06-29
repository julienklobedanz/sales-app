export function validateDecisiveReferenceId(
  decisiveReferenceId: string | null | undefined,
  linkedReferenceIds: readonly string[]
): { ok: true } | { ok: false; error: string } {
  if (!decisiveReferenceId) return { ok: true }
  if (linkedReferenceIds.includes(decisiveReferenceId)) return { ok: true }
  return {
    ok: false,
    error: 'Die entscheidende Referenz muss mit dem Deal verknüpft sein.',
  }
}

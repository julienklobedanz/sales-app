/**
 * `reference_viewed` zählt die Objekt-URL, nicht das bloße Öffnen der Bibliothek.
 * Auto-Select der ersten Zeile ist kein Öffnen. Nach dem ersten bewussten Wechsel
 * zählt auch die Rückkehr zur ersten Zeile.
 */
export function shouldLogReferenceViewed(args: {
  arrivedWithId: boolean
  referenceId: string
  firstSelectedId: string | null
  hasLeftInitialSelection?: boolean
}): boolean {
  if (!args.referenceId) return false
  if (args.arrivedWithId) return true
  if (args.hasLeftInitialSelection) return true
  return args.referenceId !== args.firstSelectedId
}

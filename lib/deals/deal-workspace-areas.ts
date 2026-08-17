/** Kanonische Bereichs-Slugs des Ausschreibungs-Arbeitsbereichs (§10.7). */
export const DEAL_WORKSPACE_AREA_IDS = [
  'steckbrief',
  'dokumente',
  'stammdaten',
  'lose',
  'eignung',
  'risiken',
  'entwuerfe',
] as const

export type DealWorkspaceArea = (typeof DEAL_WORKSPACE_AREA_IDS)[number]

export const DEAL_WORKSPACE_DEFAULT_AREA: DealWorkspaceArea = 'dokumente'

/** Panel-Bereiche — S6.3 verdrahtet `?eintrag=`. */
export const DEAL_WORKSPACE_ENTRY_AREAS = ['risiken', 'entwuerfe'] as const

export type DealWorkspaceEntryArea = (typeof DEAL_WORKSPACE_ENTRY_AREAS)[number]

export type DealWorkspaceRailSlotFill = 'filled' | 'empty' | 'collapsed'

export function isDealWorkspaceArea(value: string): value is DealWorkspaceArea {
  return (DEAL_WORKSPACE_AREA_IDS as readonly string[]).includes(value)
}

export function isDealWorkspaceEntryArea(
  value: string,
): value is DealWorkspaceEntryArea {
  return (DEAL_WORKSPACE_ENTRY_AREAS as readonly string[]).includes(value)
}

/**
 * Schmal: Label darf weg, Count nicht — die Zahlen sind der Grund für die Leiste.
 */
export function dealWorkspaceRailSlotFill(args: {
  narrow: boolean
  hasCount: boolean
}): {
  icon: 'filled'
  label: DealWorkspaceRailSlotFill
  count: DealWorkspaceRailSlotFill
} {
  return {
    icon: 'filled',
    label: args.narrow ? 'collapsed' : 'filled',
    count: args.hasCount ? 'filled' : 'empty',
  }
}

/** Kanonische Bereichs-Slugs des Ausschreibungs-Arbeitsbereichs (§10.7). */
export const DEAL_WORKSPACE_AREA_IDS = [
  'steckbrief',
  'dokumente',
  'stammdaten',
  'anforderungen',
  'eignung',
  'risiken',
  'entwuerfe',
] as const

export type DealWorkspaceArea = (typeof DEAL_WORKSPACE_AREA_IDS)[number]

export const DEAL_WORKSPACE_DEFAULT_AREA: DealWorkspaceArea = 'dokumente'

/** Panel-Bereiche — S6.3 verdrahtet `?eintrag=`. */
export const DEAL_WORKSPACE_ENTRY_AREAS = [
  'anforderungen',
  'risiken',
  'entwuerfe',
] as const

export type DealWorkspaceEntryArea = (typeof DEAL_WORKSPACE_ENTRY_AREAS)[number]

export const DEAL_WORKSPACE_ENTRY_PARAM = 'eintrag'

export const DEAL_ENTRY_PANEL_HOSTS = ['workspace'] as const

export type DealEntryPanelHost = (typeof DEAL_ENTRY_PANEL_HOSTS)[number]

export type DealWorkspaceView =
  | { area: DealWorkspaceArea; layer: 'content' }
  | { area: DealWorkspaceEntryArea; layer: 'entry-panel'; entryId: string }

/** Ein Slot — `layer` kommt aus der View. Kein zweites `floating`. */
export type DealWorkspaceLayoutChrome = {
  layer: DealWorkspaceView['layer']
  floating?: never
}

export type DealWorkspaceRailSlotFill = 'filled' | 'empty' | 'collapsed'

export function isDealWorkspaceArea(value: string): value is DealWorkspaceArea {
  return (DEAL_WORKSPACE_AREA_IDS as readonly string[]).includes(value)
}

export function isDealWorkspaceEntryArea(value: string): value is DealWorkspaceEntryArea {
  return (DEAL_WORKSPACE_ENTRY_AREAS as readonly string[]).includes(value)
}

export function isDealEntryPanelHost(host: string): host is DealEntryPanelHost {
  return (DEAL_ENTRY_PANEL_HOSTS as readonly string[]).includes(host)
}

/**
 * Panel nur bei gültiger Auswahl auf Anforderungen/Risiken/Entwürfe.
 * Ungültige Query wird gestrippt, nicht in die View übernommen.
 */
export function resolveDealWorkspaceView(
  area: DealWorkspaceArea,
  entryId: string | null,
): DealWorkspaceView {
  if (entryId && isDealWorkspaceEntryArea(area)) {
    return { area, layer: 'entry-panel', entryId }
  }
  return { area, layer: 'content' }
}

export function dealWorkspaceLayoutChrome(
  view: DealWorkspaceView,
): DealWorkspaceLayoutChrome {
  return { layer: view.layer }
}

export function dealWorkspaceSplitVisibility(args: {
  isMobile: boolean
  layer: DealWorkspaceView['layer']
}): { showList: boolean; showPanel: boolean } {
  if (args.layer !== 'entry-panel') {
    return { showList: true, showPanel: false }
  }
  if (args.isMobile) {
    return { showList: false, showPanel: true }
  }
  return { showList: true, showPanel: true }
}

/**
 * Extra-Strip neben dem Hook: Non-Entry-Area oder leere Liste.
 * Ungültige IDs bei nicht-leerer Liste übernimmt `useCollectionObjectSelection`.
 */
export function shouldStripDealWorkspaceEntryQuery(args: {
  area: DealWorkspaceArea
  selectedId: string | null
  entryCount: number
}): boolean {
  if (!args.selectedId) return false
  if (!isDealWorkspaceEntryArea(args.area)) return true
  return args.entryCount === 0
}

/**
 * Schmal: Label darf weg, Count nicht — die Zahlen sind der Grund für die Leiste.
 */
export function dealWorkspaceRailSlotFill(args: { narrow: boolean; hasCount: boolean }): {
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

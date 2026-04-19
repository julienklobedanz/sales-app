/**
 * Toolbar-Muster für Dashboard-Listen und AppDataTable.
 * Button-Höhen: {@link Button} `size="toolbar"` (h-10, Listen) bzw. {@link TABLE_TOOLBAR.dashboard} (h-11, Dashboard-Zeile).
 */
export const TABLE_TOOLBAR = {
  /** Referenzen/Evidence, Deals (`AppDataTable`) */
  list: {
    searchWrap: "relative w-full min-w-0",
    searchInput: "h-10 w-full pl-9",
  },
  /** Dashboard-Übersicht, Accounts: Suche + Buttons in einer Zeile (h-11) */
  dashboard: {
    searchInput:
      "h-11 w-full min-w-0 rounded-lg border bg-background pl-10 pr-4 shadow-sm",
    /** Ohne min-w-0 (z. B. schmale Spalten) */
    searchInputSimple: "h-11 w-full rounded-lg border bg-background pl-10 pr-4 shadow-sm",
    toolbarButton: "h-11 shrink-0 transition-all duration-300",
    toolbarButtonGap: "h-11 shrink-0 gap-1.5 transition-all duration-300",
  },
} as const

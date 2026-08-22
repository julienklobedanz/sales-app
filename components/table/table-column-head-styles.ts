/**
 * Einheitliche Tabellenkopf-Zellen — Referenzen, Deals, Compliance.
 * Hover: nur die Spalte (nicht die ganze Header-Zeile).
 * Trenner: nur die beiden Ränder der gehoverten Spalte, in Primary.
 */
const TABLE_COLUMN_HEAD_SEPARATOR =
  'before:pointer-events-none before:absolute before:inset-y-3 before:left-0 before:w-[1.5px] before:rounded-full before:bg-primary before:opacity-0 before:transition-opacity hover:before:opacity-100 after:pointer-events-none after:absolute after:inset-y-3 after:right-0 after:w-[1.5px] after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity hover:after:opacity-100'

export const TABLE_COLUMN_HEAD_CLASS = `relative h-10 align-middle px-2 text-xs font-semibold text-muted-foreground whitespace-nowrap transition-colors hover:bg-accent/45 hover:text-foreground ${TABLE_COLUMN_HEAD_SEPARATOR}`

/** Checkbox-Spalte im Tabellenkopf — ohne Hover-Highlight und ohne Trenner. */
export const TABLE_COLUMN_HEAD_SELECT_CLASS =
  'relative h-10 w-[32px] align-middle p-2 pr-0 text-xs font-semibold text-muted-foreground'

/** Checkbox-Spalte in Datenzeilen. */
export const TABLE_SELECT_COLUMN_CELL_CLASS = 'w-[32px] align-middle p-2 pr-0'

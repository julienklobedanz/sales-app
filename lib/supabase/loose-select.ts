/**
 * PostgREST-Select ohne Spalten-Inferenz (Schema-Lag, Dual-Path-Queries).
 * Nur wenn Runtime bereits fehlertolerant ist oder Migration noch nicht auf Remote liegt.
 */
export function looseSelect(columns: string): string {
  return columns
}

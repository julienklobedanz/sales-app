/** Vorwarnfenster für Vertragsende → At Risk + Primary Line (Monate). */
export const CONTRACT_END_WARNING_MONTHS = 9

/** Innerhalb dieses Fensters: Primary-Zeile rot statt amber. */
export const CONTRACT_END_CRITICAL_DAYS = 180

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function contractEndWarningDays(
  months: number = CONTRACT_END_WARNING_MONTHS,
): number {
  return Math.round(months * 30.4375)
}

export function daysUntilDate(isoDate: string, now: Date = new Date()): number | null {
  if (!isoDate.trim()) return null
  const end = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`)
  if (Number.isNaN(end.getTime())) return null
  const start = new Date(now)
  start.setHours(12, 0, 0, 0)
  end.setHours(12, 0, 0, 0)
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
}

/** true wenn Vertragsende in der Zukunft oder heute und innerhalb des Warnfensters. */
export function isContractEndWithinWarningWindow(
  contractEndDate: string | null | undefined,
  now: Date = new Date(),
  warningMonths: number = CONTRACT_END_WARNING_MONTHS,
): boolean {
  if (!contractEndDate?.trim()) return false
  const days = daysUntilDate(contractEndDate, now)
  if (days == null) return false
  if (days < 0) return false
  return days <= contractEndWarningDays(warningMonths)
}

export function contractEndPrimaryTone(
  contractEndDate: string,
  now: Date = new Date(),
): 'danger' | 'warning' {
  const days = daysUntilDate(contractEndDate, now)
  if (days != null && days <= CONTRACT_END_CRITICAL_DAYS) return 'danger'
  return 'warning'
}

/** Relative deutsche Copy: „in 9 Monaten“ / „in 12 Tagen“ / „diesen Monat“. */
export function formatContractEndRelativeLabel(
  contractEndDate: string,
  now: Date = new Date(),
): string {
  const days = daysUntilDate(contractEndDate, now)
  if (days == null) return 'läuft bald aus'
  if (days <= 0) return 'läuft heute aus'
  if (days === 1) return 'läuft morgen aus'
  if (days < 30) return `läuft in ${days} Tagen aus`
  const months = Math.max(1, Math.round(days / 30.4375))
  if (months === 1) return 'läuft diesen Monat aus'
  return `läuft in ${months} Monaten aus`
}

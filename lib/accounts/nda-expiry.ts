/**
 * NDA-Ablauf: einheitlicher Vorwarnzeitraum (B2B typisch 30 Tage für Verlängerung/Legal).
 * Gleiche Schwelle wie Badge „NDA läuft ab“ in Accounts.
 */
export const NDA_EXPIRY_WARNING_DAYS = 30

/** Kritische Stufe innerhalb des Vorwarnfensters (Erinnerung mit höherer Priorität). */
const NDA_EXPIRY_CRITICAL_DAYS = 7

export type NdaExpiryUrgency = 'expired' | 'critical' | 'warning'

export function ndaDaysUntilExpiry(
  validUntil: string,
  refDate: Date = new Date(),
): number {
  const today = new Date(refDate)
  today.setHours(0, 0, 0, 0)
  const end = new Date(`${validUntil}T12:00:00`)
  end.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

export function ndaExpiryUrgency(daysUntil: number): NdaExpiryUrgency | null {
  if (daysUntil < 0) return 'expired'
  if (daysUntil <= NDA_EXPIRY_CRITICAL_DAYS) return 'critical'
  if (daysUntil <= NDA_EXPIRY_WARNING_DAYS) return 'warning'
  return null
}

export function shouldNotifyNdaExpiry(input: {
  status: string
  validUntil: string | null
  refDate?: Date
}): { daysUntil: number; urgency: NdaExpiryUrgency } | null {
  if (!input.validUntil?.trim()) return null
  const status = String(input.status ?? '').toLowerCase()
  if (status !== 'active' && status !== 'pending') return null

  const daysUntil = ndaDaysUntilExpiry(input.validUntil, input.refDate)
  const urgency = ndaExpiryUrgency(daysUntil)
  if (!urgency) return null

  return { daysUntil, urgency }
}

export function formatNdaExpiryDateDe(validUntil: string): string {
  try {
    return new Date(`${validUntil}T12:00:00`).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return validUntil
  }
}

export function buildNdaExpiryNotificationText(
  companyName: string,
  validUntil: string,
  daysUntil: number,
): string {
  const dateLabel = formatNdaExpiryDateDe(validUntil)
  if (daysUntil < 0) {
    const overdue = Math.abs(daysUntil)
    return `NDA mit ${companyName} ist am ${dateLabel} abgelaufen (${overdue} Tag${overdue === 1 ? '' : 'e'} überfällig) — bitte Verlängerung prüfen.`
  }
  if (daysUntil === 0) {
    return `NDA mit ${companyName} läuft heute (${dateLabel}) ab.`
  }
  if (daysUntil === 1) {
    return `NDA mit ${companyName} läuft morgen (${dateLabel}) ab.`
  }
  return `NDA mit ${companyName} läuft am ${dateLabel} ab (in ${daysUntil} Tagen).`
}

export function ndaExpiryInboxPriority(urgency: NdaExpiryUrgency): number {
  if (urgency === 'expired') return 0
  if (urgency === 'critical') return 1
  return 2
}

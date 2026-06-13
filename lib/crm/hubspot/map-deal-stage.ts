/** HubSpot Deal-Stages → RefStack Deal-Status (vereinfachtes MVP-Mapping). */
export function mapHubSpotStageToDealStatus(stage: string | null | undefined): string {
  const normalized = String(stage ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

  if (!normalized) return 'open'

  if (
    normalized.includes('closedwon') ||
    normalized.includes('closed_won') ||
    normalized === 'won'
  ) {
    return 'won'
  }

  if (
    normalized.includes('closedlost') ||
    normalized.includes('closed_lost') ||
    normalized === 'lost'
  ) {
    return 'lost'
  }

  if (normalized.includes('rfp') || normalized.includes('proposal')) {
    return 'rfp'
  }

  if (
    normalized.includes('negotiat') ||
    normalized.includes('contract') ||
    normalized.includes('verhandl')
  ) {
    return 'negotiation'
  }

  return 'open'
}

export function formatHubSpotAmount(amount: number | null | undefined): string | null {
  if (amount == null || !Number.isFinite(amount)) return null
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

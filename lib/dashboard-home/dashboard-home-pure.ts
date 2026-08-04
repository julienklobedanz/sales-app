export function dashboardFirstName(fullName: string | null | undefined): string {
  const s = fullName?.trim()
  if (!s) return ''
  return s.split(/\s+/)[0] ?? ''
}

export function computeWinRateMetrics(
  closedDealsCount: number,
  wonCount: number,
  minClosedForWinRate: number,
): {
  available: boolean
  percent: number | null
  closedDealsCount: number
} {
  const available = closedDealsCount >= minClosedForWinRate
  const percent = available ? Math.round((wonCount / closedDealsCount) * 100) : null
  return { available, percent, closedDealsCount }
}

export function countDueMarketSnoozes(snoozeKeys: string[], nowMs: number): number {
  return snoozeKeys.filter((k) => {
    if (!k.startsWith('market_snooze_until:')) return false
    const parts = k.split(':')
    if (parts.length < 4) return false
    const until = new Date(parts[2] ?? '').getTime()
    return Number.isFinite(until) && until <= nowMs
  }).length
}

export function meddpiccAccountAction(flags: {
  hasChampion: boolean
  hasEconomic: boolean
  hasGoals: boolean
}): { meddpiccGap: string; actionLabel: string } {
  if (!flags.hasEconomic) {
    return { meddpiccGap: 'MEDDPICC: Economic Buyer fehlt', actionLabel: 'Fix' }
  }
  if (!flags.hasChampion) {
    return { meddpiccGap: 'MEDDPICC: Champion fehlt', actionLabel: 'Fix' }
  }
  if (!flags.hasGoals) {
    return { meddpiccGap: 'MEDDPICC: Metrics/Pain fehlt', actionLabel: 'Fix' }
  }
  return { meddpiccGap: 'Story passt zum Signal', actionLabel: 'Send' }
}

export function integrationConnectionStatus(
  val: unknown,
): 'healthy' | 'warning' | 'down' {
  if (val === true || val === 'connected') return 'healthy'
  if (val === 'error' || val === 'down') return 'down'
  return 'warning'
}

export function teamActivityLabelForEvent(eventType: string): string {
  if (eventType === 'share_link_viewed' || eventType === 'reference_shared') {
    return 'hat einen Share-Link erstellt'
  }
  if (eventType === 'reference_matched') {
    return 'hat ein Match erzeugt'
  }
  return 'hat ein Event ausgelöst'
}

const SIGNAL_KEY_PREFIXES = ['market_exec:', 'market_news:'] as const

export function extractSignalKeyFromSnoozeNotification(notificationKey: string): string | null {
  if (!notificationKey.startsWith('market_snooze_until:')) return null
  const rest = notificationKey.slice('market_snooze_until:'.length)
  let idx = -1
  for (const prefix of SIGNAL_KEY_PREFIXES) {
    const i = rest.indexOf(prefix)
    if (i >= 0 && (idx < 0 || i < idx)) idx = i
  }
  if (idx < 0) return null
  return rest.slice(idx)
}

/** Parsed `market_snooze_until:{iso}:{signalKey}` — ISO may contain `:`. */
export function parseMarketSnoozeUntilMs(notificationKey: string): number | null {
  if (!notificationKey.startsWith('market_snooze_until:')) return null
  const signalKey = extractSignalKeyFromSnoozeNotification(notificationKey)
  if (!signalKey) return null
  const rest = notificationKey.slice('market_snooze_until:'.length)
  const untilIso = rest.slice(0, rest.length - signalKey.length - 1)
  const until = new Date(untilIso).getTime()
  return Number.isFinite(until) ? until : null
}

export function isMarketSignalSnoozed(
  notificationKeys: string[],
  signalKey: string,
  nowMs: number
): boolean {
  for (const key of notificationKeys) {
    if (extractSignalKeyFromSnoozeNotification(key) !== signalKey) continue
    const until = parseMarketSnoozeUntilMs(key)
    if (until != null && until > nowMs) return true
  }
  return false
}

export function isMarketSignalDismissed(notificationKeys: string[], signalKey: string): boolean {
  const irrelevant = `market_irrelevant:${signalKey}`
  return notificationKeys.some((k) => k === irrelevant)
}

export function isMarketSignalCallCompleted(notificationKeys: string[], signalKey: string): boolean {
  return notificationKeys.some((k) => k.startsWith(`market_outcome:`) && k.endsWith(`:${signalKey}`))
}

export function normalizeChampionPersonKey(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

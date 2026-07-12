const HUBSPOT_STAGE_LABELS: Record<string, string> = {
  appointmentscheduled: 'Termin geplant',
  qualifiedtobuy: 'Qualifiziert',
  presentationscheduled: 'Präsentation',
  decisionmakerboughtin: 'Entscheider involviert',
  contractsent: 'Vertrag gesendet',
  closedwon: 'Gewonnen',
  closedlost: 'Verloren',
}

/** Rohwert aus CRM (oft interne Stage-ID) für die UI lesbar machen. */
export function formatCrmStageLabel(raw: string | null | undefined): string | null {
  const value = String(raw ?? '').trim()
  if (!value) return null

  const normalizedKey = value.toLowerCase().replace(/[\s_-]+/g, '')
  const known = HUBSPOT_STAGE_LABELS[normalizedKey]
  if (known) return known

  if (/^[0-9]+$/.test(value)) {
    return `Stage ${value}`
  }

  if (value.includes('_') || value.includes('-')) {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return value
}

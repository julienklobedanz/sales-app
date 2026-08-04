/** Vertragsarten — Anzeige und Speicherung nur auf Deutsch, ohne Klammer-Zusätze. */
export const CONTRACT_TYPE_GROUPS = [
  {
    label: 'Standard',
    options: ['Festpreis', 'Time & Material', 'Rahmenvertrag'],
  },
  {
    label: 'SaaS',
    options: ['Abo pro Nutzer / Staffel', 'Nutzungsbasiert'],
  },
  {
    label: 'MSP',
    options: ['SLA-Servicevertrag', 'Komplett-Managed', 'Stundenkontingent'],
  },
  {
    label: 'Andere',
    options: ['Andere'],
  },
] as const

export const CONTRACT_TYPE_VALUES: string[] = CONTRACT_TYPE_GROUPS.flatMap((group) => [
  ...group.options,
])

/** Ältere DB- und Formularwerte → kanonische deutsche Bezeichnung. */
const LEGACY_CONTRACT_TYPE_LABELS: Record<string, string> = {
  'Festpreis (Fixed Price)': 'Festpreis',
  'Fixed Price': 'Festpreis',
  'Subscription (Per User/Tiered)': 'Abo pro Nutzer / Staffel',
  'Usage-Based': 'Nutzungsbasiert',
  'Full Managed': 'Komplett-Managed',
  Projektvertrag: 'Projektvertrag',
  Wartungsvertrag: 'Wartungsvertrag',
  'SaaS / Subscription': 'Abo pro Nutzer / Staffel',
}

/**
 * Anzeige der Vertragsart: nur deutsche Bezeichnung, ohne englische Klammerzusätze.
 */
export function formatContractTypeDisplay(raw: string | null | undefined): string {
  const trimmed = raw?.trim()
  if (!trimmed) return ''

  if (LEGACY_CONTRACT_TYPE_LABELS[trimmed]) {
    return LEGACY_CONTRACT_TYPE_LABELS[trimmed]
  }

  const withoutParenthetical = trimmed.replace(/\s*\([^)]*\)\s*$/, '').trim()
  if (withoutParenthetical && LEGACY_CONTRACT_TYPE_LABELS[withoutParenthetical]) {
    return LEGACY_CONTRACT_TYPE_LABELS[withoutParenthetical]
  }

  if (CONTRACT_TYPE_VALUES.includes(withoutParenthetical)) {
    return withoutParenthetical
  }

  return withoutParenthetical || trimmed
}

/** Beim Speichern auf kanonische deutsche Werte normalisieren. */
export function normalizeContractType(raw: string | null | undefined): string | null {
  const normalized = formatContractTypeDisplay(raw)
  return normalized || null
}

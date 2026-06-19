import type { ReferenceFormStatus } from '@/lib/references/reference-form/reference-form-types'

export const COUNTRIES = [
  'Deutschland',
  'Österreich',
  'Schweiz',
  'Frankreich',
  'Großbritannien',
  'USA',
  'Sonstige',
]

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'internal_only', label: 'Nur Intern' },
  { value: 'approved', label: 'Extern freigegeben' },
  { value: 'anonymized', label: 'Anonymisiert' },
] as const

export const STATUS_HELP_TEXT: Record<ReferenceFormStatus, string> = {
  draft: 'Entwurf: In Arbeit, nur für den Ersteller sichtbar.',
  internal_only:
    'Nur Intern: Verifiziert, aber sensible Daten (Preise/Namen) dürfen das Haus nicht verlassen.',
  approved:
    'Extern freigegeben: Offiziell vom Kunden und Marketing freigegeben für Sales-Pitches.',
  anonymized:
    'Anonymisiert: Name und Logo entfernt (z. B. „Großbank“), bereit für öffentliche Case Studies.',
}

export const PROJECT_STATUS_OPTIONS = [
  { value: '__none__', label: '— Keine Angabe' },
  { value: 'active', label: 'Aktiv' },
  { value: 'completed', label: 'Abgeschlossen' },
] as const

export const VOLUME_CURRENCY_OPTIONS = [
  { code: 'AED', symbol: 'AED' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'CHF', symbol: 'CHF' },
  { code: 'CNY', symbol: '¥' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'HKD', symbol: 'HK$' },
  { code: 'JPY', symbol: '¥' },
  { code: 'SGD', symbol: 'S$' },
  { code: 'USD', symbol: '$' },
] as const


/** DB-Werte für `companies.account_status` (snake_case). */
export const COMPANY_ACCOUNT_STATUS_VALUES = [
  'target',
  'active_customer',
  'former_customer',
  'at_risk',
] as const

export type CompanyAccountStatusValue = (typeof COMPANY_ACCOUNT_STATUS_VALUES)[number]

export function normalizeCompanyAccountStatus(
  raw: string | null | undefined,
): CompanyAccountStatusValue | null {
  const s = raw?.trim() ?? ''
  if (!s) return null
  return COMPANY_ACCOUNT_STATUS_VALUES.includes(s as CompanyAccountStatusValue)
    ? (s as CompanyAccountStatusValue)
    : null
}

export type AccountStatusFormValue = '__none__' | CompanyAccountStatusValue

export const ACCOUNT_STATUS_FORM_OPTIONS: {
  value: AccountStatusFormValue
  label: string
  /** Kurzbeschreibung für Tooltip / spätere Marktsignal-Logik */
  description: string
}[] = [
  { value: '__none__', label: '— Keine Angabe', description: '' },
  {
    value: 'target',
    label: 'Target',
    description:
      'Ist Zielkunde: noch kein Deal, wir wollen rein. Signale triggern den First Outreach.',
  },
  {
    value: 'active_customer',
    label: 'Aktiver Kunde',
    description: 'Regelmäßiges Geschäft, stabil. Fokus: Relationship-Management.',
  },
  {
    value: 'former_customer',
    label: 'Ehemaliger Kunde',
    description: 'Churned – Signale für Re-Activation (z. B. nach 6–12 Monaten).',
  },
  {
    value: 'at_risk',
    label: 'Account at Risk',
    description:
      'Kritisch markieren (z. B. Champion verlässt das Unternehmen) – sofortige Aufmerksamkeit.',
  },
]

export function accountStatusFromDb(raw: string | null): AccountStatusFormValue {
  if (raw === 'warmup') return 'target'
  if (raw === 'expansion') return 'active_customer'
  const n = normalizeCompanyAccountStatus(raw)
  return n ?? '__none__'
}

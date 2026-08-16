/** §10.9 Aufnahmetest: hilft der Inhalt, einen Beweis zu erzeugen oder zu platzieren? */

export const ACCOUNT_DETAIL_SURFACES = [
  'header',
  'nda',
  'pipeline',
  'proof_points',
] as const

export type AccountDetailSurface = (typeof ACCOUNT_DETAIL_SURFACES)[number]

export const ACCOUNT_DETAIL_CARE_SURFACES = [
  'mission_control',
  'buying_center',
] as const

export type AccountDetailCareSurface = (typeof ACCOUNT_DETAIL_CARE_SURFACES)[number]

export function isAdmittedAccountDetailSurface(id: string): boolean {
  return (ACCOUNT_DETAIL_SURFACES as readonly string[]).includes(id)
}

export function isAccountDetailCareSurface(id: string): boolean {
  return (ACCOUNT_DETAIL_CARE_SURFACES as readonly string[]).includes(id)
}

export const ACCOUNT_DETAIL_LOAD_KEYS = [
  'strategy',
  'stakeholders',
  'internalContacts',
  'externalContacts',
  'marketSignals',
  'deals',
  'references',
  'nda',
] as const

export type AccountDetailLoadKey = (typeof ACCOUNT_DETAIL_LOAD_KEYS)[number]

const ACCOUNT_DETAIL_LOAD: Record<AccountDetailLoadKey, boolean> = {
  strategy: false,
  stakeholders: false,
  internalContacts: false,
  externalContacts: false,
  marketSignals: false,
  deals: true,
  references: true,
  nda: true,
}

export function accountDetailLoads(key: AccountDetailLoadKey): boolean {
  return ACCOUNT_DETAIL_LOAD[key]
}

/** Sales-Rep-Startseite liest keine Pflege-Tabellen (`stakeholders`, `company_strategies`). */
export function salesRepHomeReadsCareTables(): boolean {
  return false
}

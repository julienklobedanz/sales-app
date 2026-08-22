/** §10.9: Die Account-Linse hat keine eigenen bearbeitbaren Felder. */

export const ACCOUNT_LENS_SECTIONS = [
  'identity',
  'state',
  'proofs',
  'deals',
  'signal',
] as const

export type AccountLensSection = (typeof ACCOUNT_LENS_SECTIONS)[number]

export type AccountLensSectionPresence = 'shown' | 'omitted'

export const ACCOUNT_LENS_CARE_KEYS = [
  'strategy',
  'stakeholders',
  'internalContacts',
  'externalContacts',
  'marketSignals',
] as const

/**
 * Sales-Rep-Startseite liest keine Pflege-Tabellen
 * (`stakeholders`, `company_strategies` — die Care-Keys der Linse).
 */
export function salesRepHomeReadsCareTables(): boolean {
  return false
}

const ACCOUNT_LENS_LOAD_KEYS = [
  'deals',
  'references',
  'nda',
  'actionableSignal',
] as const

export type AccountLensLoadKey = (typeof ACCOUNT_LENS_LOAD_KEYS)[number]

const ACCOUNT_LENS_LOAD: Record<AccountLensLoadKey, boolean> = {
  deals: true,
  references: true,
  nda: true,
  actionableSignal: true,
}

export function accountLensLoads(key: AccountLensLoadKey): boolean {
  return ACCOUNT_LENS_LOAD[key]
}

/** Schmaler Guard an der Grenze, nicht in `accountLensLoads`. */
export function isAccountLensLoadKey(key: string): key is AccountLensLoadKey {
  return (ACCOUNT_LENS_LOAD_KEYS as readonly string[]).includes(key)
}

export function accountLensSectionPresence(args: {
  hasDeals: boolean
  hasActionableSignal: boolean
}): Record<AccountLensSection, AccountLensSectionPresence> {
  return {
    identity: 'shown',
    state: 'shown',
    proofs: 'shown',
    deals: args.hasDeals ? 'shown' : 'omitted',
    signal: args.hasActionableSignal ? 'shown' : 'omitted',
  }
}

/** NDA-Einstieg ist kein Linsenfeld — die Liste bleibt leer. */
export function accountLensEditableControlIds(): readonly string[] {
  return []
}

/** Eine Signalzeile nur mit Anlass zum Platzieren: offener Deal plus vorliegendes Signal. */
export function accountLensHasActionableSignal(args: {
  hasOpenDeals: boolean
  latestSignalSummary: string | null | undefined
}): boolean {
  return args.hasOpenDeals && Boolean(args.latestSignalSummary?.trim())
}

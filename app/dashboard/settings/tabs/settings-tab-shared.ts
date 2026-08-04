export const SETTINGS_CARD_CLASS =
  'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'
/** Kompaktere Card für den Persönlich-Tab (weniger Padding, gleicher Card-Look). */
export const SETTINGS_CARD_CLASS_COMPACT =
  'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'
export const SETTINGS_DANGER_ZONE_CLASS =
  'rounded-xl border border-red-300 bg-red-50/50 p-6 shadow-sm'
export const SETTINGS_DANGER_ZONE_CLASS_COMPACT =
  'rounded-xl border border-red-300 bg-red-50/50 p-4 shadow-sm'

/** Canonical settings tabs (4). Legacy query params map onto these. */
export type SettingsTabId = 'profile' | 'workspace' | 'integrations' | 'process'

export type SettingsTabHandlers = {
  dirty: boolean
  pending: boolean
  save: () => void
}

export type RegisterSettingsTab = (
  tabId: SettingsTabId,
  handlers: SettingsTabHandlers | null,
  partKey?: string,
) => void

/** Maps old ?tab= values and synonyms onto the 4-tab IA. */
export function resolveSettingsTabId(raw: string | null): SettingsTabId | null {
  if (!raw) return null
  switch (raw) {
    case 'profile':
    case 'personal':
    case 'personlich':
    case 'persönlich':
      return 'profile'
    case 'workspace':
    case 'team':
    case 'roles':
      return 'workspace'
    case 'integrations':
    case 'connections':
    case 'verbindungen':
      return 'integrations'
    case 'process':
    case 'prozess':
    case 'workflow':
    case 'admin':
      return 'process'
    default:
      return null
  }
}

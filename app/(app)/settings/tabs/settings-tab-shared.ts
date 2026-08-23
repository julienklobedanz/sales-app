/** Canonical settings tabs (3). Legacy query params map onto these. */
export type SettingsTabId = 'profile' | 'workspace' | 'process'

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

/** Maps old ?tab= values and synonyms onto the 3-tab IA. */
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
      return 'workspace'
    case 'process':
    case 'prozess':
    case 'workflow':
    case 'admin':
      return 'process'
    default:
      return null
  }
}

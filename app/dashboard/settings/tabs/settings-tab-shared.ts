export const SETTINGS_CARD_CLASS = 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'
export const SETTINGS_DANGER_ZONE_CLASS =
  'rounded-xl border border-red-300 bg-red-50/50 p-6 shadow-sm'

export type SettingsTabId =
  | 'profile'
  | 'workspace'
  | 'team'
  | 'roles'
  | 'integrations'
  | 'workflow'
  | 'admin'

export type SettingsTabHandlers = {
  dirty: boolean
  pending: boolean
  save: () => void
}

export type RegisterSettingsTab = (
  tabId: SettingsTabId,
  handlers: SettingsTabHandlers | null,
  partKey?: string
) => void

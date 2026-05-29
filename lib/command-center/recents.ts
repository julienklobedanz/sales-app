export type CommandRecentKind = 'reference' | 'account' | 'deal'

export type CommandRecentItem = {
  kind: CommandRecentKind
  id: string
  title: string
  accountName?: string | null
  at: number
}

export const COMMAND_RECENTS_KEY = 'refstack.recents.v1'
export const COMMAND_RECENTS_MAX = 5

export function loadCommandRecents(): CommandRecentItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(COMMAND_RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return (parsed as unknown[])
      .filter((x): x is CommandRecentItem => {
        if (!x || typeof x !== 'object') return false
        const r = x as Partial<CommandRecentItem>
        return (
          typeof r.id === 'string' &&
          typeof r.kind === 'string' &&
          typeof r.title === 'string' &&
          typeof r.at === 'number'
        )
      })
      .slice(0, COMMAND_RECENTS_MAX)
  } catch {
    return []
  }
}

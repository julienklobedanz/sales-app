import {
  COMMAND_RECENTS_KEY,
  COMMAND_RECENTS_MAX,
  loadCommandRecents,
  type CommandRecentItem,
} from './recents'

export function pushCommandRecent(item: Omit<CommandRecentItem, 'at'>) {
  const prev = loadCommandRecents()
  const nextAt = (prev[0]?.at ?? 0) + 1
  const next: CommandRecentItem[] = [
    { ...item, at: nextAt },
    ...prev.filter((x) => !(x.kind === item.kind && x.id === item.id)),
  ].slice(0, COMMAND_RECENTS_MAX)
  try {
    localStorage.setItem(COMMAND_RECENTS_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

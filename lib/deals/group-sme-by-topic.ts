import type { DealDeskSmeTask } from '@/lib/deal-desk/deal-analysis-types'

export type SmeTopicGroup = {
  topic: string
  items: DealDeskSmeTask[]
}

export function groupSmeTasksByTopic(tasks: DealDeskSmeTask[]): SmeTopicGroup[] {
  const map = new Map<string, DealDeskSmeTask[]>()
  for (const task of tasks) {
    const topic = task.category?.trim() || 'Allgemein'
    const list = map.get(topic) ?? []
    list.push(task)
    map.set(topic, list)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'de'))
    .map(([topic, items]) => ({ topic, items }))
}

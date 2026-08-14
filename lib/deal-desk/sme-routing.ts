import type { DealDeskSmeTask } from '@/lib/deal-desk/deal-analysis-types'

export type DealDeskSmeAssignment = {
  route: string
  assigneeId: string
  assigneeName: string
  assigneeEmail?: string | null
}

export type SmeExpertOption = {
  id: string
  name: string
  route: string
  department: string
  email?: string | null
}

export const SME_ROUTE_META = [
  { value: 'legal', label: 'Legal', department: 'Legal' },
  { value: 'cto', label: 'CTO / Delivery', department: 'Delivery / CTO' },
  { value: 'cfo', label: 'Finance', department: 'Finance' },
  { value: 'security', label: 'Security', department: 'Security' },
  { value: 'delivery', label: 'Delivery', department: 'Delivery' },
] as const

export const SME_DEFAULT_EXPERTS: SmeExpertOption[] = [
  {
    id: 'ex-ck',
    name: 'Christian K.',
    route: 'legal',
    department: 'Legal',
    email: 'christian.k@example.com',
  },
  {
    id: 'ex-lh',
    name: 'Lena Hoffmann',
    route: 'cto',
    department: 'Delivery / CTO',
    email: 'lena.h@example.com',
  },
  { id: 'ex-mw', name: 'Markus Weber', route: 'cto', department: 'Delivery / CTO' },
  { id: 'ex-sk', name: 'Sarah Klein', route: 'cfo', department: 'Finance' },
  { id: 'ex-ts', name: 'Tobias Schneider', route: 'security', department: 'Security' },
  { id: 'ex-delivery', name: 'Alex R.', route: 'delivery', department: 'Delivery' },
]

export function getSmeCategoryBadgeClass(category: string): string {
  const c = category.toLowerCase()
  if (c.includes('legal') || c.includes('compliance')) {
    return 'border-purple-200 bg-purple-50 text-purple-700'
  }
  if (c.includes('cto') || c.includes('delivery') || c.includes('techn')) {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }
  if (c.includes('finance') || c.includes('pricing')) {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }
  if (c.includes('security')) {
    return 'border-border bg-accent text-foreground'
  }
  return 'border-border bg-muted text-foreground'
}

export function getSmeDueBadgeClass(dueInDays: number): string {
  if (dueInDays < 3) {
    return 'border-red-100 bg-red-50 text-red-700'
  }
  return 'border-transparent bg-accent text-muted-foreground'
}

export function formatSmeDueLabel(dueInDays: number): string {
  if (dueInDays === 0) return 'Heute'
  if (dueInDays === 1) return 'Frist: 1 Tag'
  return `Frist: ${dueInDays} Tage`
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
}

export function routeLabel(route: string): string {
  return SME_ROUTE_META.find((r) => r.value === route)?.department ?? route
}

export function expertsForRoute(
  route: string,
  pool: SmeExpertOption[],
  custom: SmeExpertOption[],
): SmeExpertOption[] {
  return [...pool, ...custom].filter((e) => e.route === route)
}

export function guessRouteFromCategory(category: string): string {
  const c = category.toLowerCase()
  if (c.includes('legal')) return 'legal'
  if (c.includes('finance') || c.includes('pricing')) return 'cfo'
  if (c.includes('security')) return 'security'
  if (c.includes('delivery') || c.includes('cto')) return 'cto'
  return 'delivery'
}

export function smeContextPreview(task: DealDeskSmeTask): {
  pageHint: string
  excerpt: string
} | null {
  if (task.contextExcerpt) {
    return {
      pageHint: task.contextPageHint ?? 'RFP-Dokument',
      excerpt: task.contextExcerpt,
    }
  }
  return null
}

export function parseSmeAssignments(
  raw: unknown,
  legacyRoutes: Record<string, string> = {},
): Record<string, DealDeskSmeAssignment> {
  const out: Record<string, DealDeskSmeAssignment> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [taskId, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue
      const o = value as Record<string, unknown>
      const route = typeof o.route === 'string' ? o.route : ''
      const assigneeId = typeof o.assigneeId === 'string' ? o.assigneeId : ''
      const assigneeName = typeof o.assigneeName === 'string' ? o.assigneeName : ''
      if (!route || !assigneeId || !assigneeName) continue
      out[taskId] = {
        route,
        assigneeId,
        assigneeName,
        assigneeEmail: typeof o.assigneeEmail === 'string' ? o.assigneeEmail : null,
      }
    }
  }
  for (const [taskId, route] of Object.entries(legacyRoutes)) {
    if (out[taskId] || !route) continue
    const expert = SME_DEFAULT_EXPERTS.find((e) => e.route === route)
    if (expert) {
      out[taskId] = {
        route,
        assigneeId: expert.id,
        assigneeName: expert.name,
        assigneeEmail: expert.email ?? null,
      }
    }
  }
  return out
}

export const DEMO_SME_PREVIEW_ASSIGNMENT: DealDeskSmeAssignment = {
  route: 'legal',
  assigneeId: 'ex-ck',
  assigneeName: 'Christian K.',
  assigneeEmail: 'christian.k@example.com',
}

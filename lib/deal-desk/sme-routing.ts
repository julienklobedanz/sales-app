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

const SME_DEFAULT_EXPERTS: SmeExpertOption[] = [
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

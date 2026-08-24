import { ROUTES } from '@/lib/routes'

const COMPLIANCE_VIEW_PARAM = 'view'

export function complianceReadHref(id: string): string {
  const params = new URLSearchParams()
  params.set(COMPLIANCE_VIEW_PARAM, 'lesen')
  params.set('id', id)
  return `${ROUTES.compliance.root}?${params.toString()}`
}

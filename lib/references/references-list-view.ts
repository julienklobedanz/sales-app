import { ROUTES } from '@/lib/routes'

const REFERENCES_VIEW_PARAM = 'view'
const REFERENCES_OBJECT_PARAM = 'id'

export function referencesReadHref(
  id: string,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams()
  params.set(REFERENCES_VIEW_PARAM, 'lesen')
  params.set(REFERENCES_OBJECT_PARAM, id)
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      params.set(key, value)
    }
  }
  return `${ROUTES.references.root}?${params.toString()}`
}

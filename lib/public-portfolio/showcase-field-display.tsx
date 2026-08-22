import type { ReactNode } from 'react'

import { ShowcaseLockedFieldIcon } from '@/lib/public-portfolio/showcase-locked-field-icon'

export function showcaseFieldDisplay(
  raw: string | null | undefined,
  revokeMode: boolean,
): { show: boolean; value: ReactNode } {
  const text = raw != null ? String(raw).trim() : ''
  const empty = !text || text === '—'
  if (!revokeMode && empty) {
    return { show: false, value: '' }
  }
  if (empty) {
    return {
      show: true,
      value: <ShowcaseLockedFieldIcon />,
    }
  }
  return { show: true, value: text }
}

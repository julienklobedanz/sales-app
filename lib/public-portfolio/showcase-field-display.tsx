import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'

export const SHOWCASE_FIELD_LOCKED_LABEL = 'Nicht in Freigabe / keine Angabe'

export function isShowcaseFieldEmpty(value: string | null | undefined): boolean {
  const s = value != null ? String(value).trim() : ''
  return !s || s === '—'
}

export function showcaseFieldDisplay(
  raw: string | null | undefined,
  revokeMode: boolean
): { show: boolean; value: ReactNode } {
  const text = raw != null ? String(raw).trim() : ''
  const empty = !text || text === '—'
  if (!revokeMode && empty) {
    return { show: false, value: '' }
  }
  if (empty) {
    return {
      show: true,
      value: (
        <span
          title={SHOWCASE_FIELD_LOCKED_LABEL}
          aria-label={SHOWCASE_FIELD_LOCKED_LABEL}
          className="inline-flex items-center text-muted-foreground"
        >
          <Lock className="h-4 w-4" />
        </span>
      ),
    }
  }
  return { show: true, value: text }
}

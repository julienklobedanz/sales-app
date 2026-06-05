import type { AppRole } from '@/hooks/useRole'

/** Cookie für die in der Oberfläche gewählte Rolle (wirkt zusammen mit `profiles.role` im Layout). */
export const DEV_ROLE_COOKIE = 'refstack_dev_role'

/** Rollen-Vorschau nur in Development (oder explizit per `NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW=1`). */
export function isDevRolePreviewEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW?.trim()
  if (flag === '1') return true
  if (flag === '0') return false
  return process.env.NODE_ENV !== 'production'
}

export function parseAppRoleCookie(value: string | undefined): AppRole | null {
  if (!value) return null
  if (value === 'admin' || value === 'sales' || value === 'account_manager') return value
  return null
}

import type { AppRole } from '@/hooks/useRole'

/** Cookie für die in der Oberfläche gewählte Rolle (wirkt zusammen mit `profiles.role` im Layout). */
export const DEV_ROLE_COOKIE = 'refstack_dev_role'

export function parseAppRoleCookie(value: string | undefined): AppRole | null {
  if (!value) return null
  if (value === 'admin' || value === 'sales' || value === 'account_manager') return value
  return null
}

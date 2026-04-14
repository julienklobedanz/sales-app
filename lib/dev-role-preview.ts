import type { AppRole } from '@/hooks/useRole'

/** Cookie-Name: nur gültig wenn {@link isDevRolePreviewEnabled}. */
export const DEV_ROLE_COOKIE = 'refstack_dev_role'

/** Rollen-Vorschau nur während Entwicklung / explizit per Env (nicht in Produktion aktivieren). */
export function isDevRolePreviewEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.DEV_ROLE_PREVIEW === '1' ||
    process.env.NEXT_PUBLIC_DEV_ROLE_SWITCHER === 'true'
  )
}

export function parseAppRoleCookie(value: string | undefined): AppRole | null {
  if (!value) return null
  if (value === 'admin' || value === 'sales' || value === 'account_manager') return value
  return null
}

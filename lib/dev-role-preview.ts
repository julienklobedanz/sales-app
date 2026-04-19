import type { AppRole } from '@/hooks/useRole'

/** Cookie-Name: nur gültig wenn {@link isDevRolePreviewEnabled}. */
export const DEV_ROLE_COOKIE = 'refstack_dev_role'

/**
 * Ob die Rollen-Umschaltung für die Oberfläche aktiv ist (Profilmenü + Einstellungen → Tab „Entwicklung“).
 *
 * **Nur serverseitig aufrufen** (Layout, Server Actions, `page.tsx`). Nicht in Client-Komponenten
 * zur Anzeige nutzen: `VERCEL_ENV` / `NODE_ENV` sind im Browser-Bundle nicht zuverlässig dieselbe
 * Logik → UI-Gating über vom Layout gereichte Props (`roleSwitcherEnabled`).
 *
 * **Standard während der Entwicklung:** eingeschaltet, ohne weitere Konfiguration
 * (`next dev`, `next start`, Preview-Deployments, Tunnel, LAN-IP …).
 *
 * **Aus:**
 * - `NEXT_PUBLIC_DEV_ROLE_SWITCHER=false` (empfohlen für öffentliches Produktions-Hosting)
 * - `VERCEL_ENV=production` (Vercel Production)
 *
 * **Explizit an:** `NEXT_PUBLIC_DEV_ROLE_SWITCHER=true` oder `1`
 */
export function isDevRolePreviewEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DEV_ROLE_SWITCHER === 'false') return false
  const pub = process.env.NEXT_PUBLIC_DEV_ROLE_SWITCHER
  if (pub === 'true' || pub === '1') return true
  if (process.env.VERCEL_ENV === 'production') return false
  return true
}

export function parseAppRoleCookie(value: string | undefined): AppRole | null {
  if (!value) return null
  if (value === 'admin' || value === 'sales' || value === 'account_manager') return value
  return null
}

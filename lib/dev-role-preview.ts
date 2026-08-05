import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { isSystemAdmin } from '@/lib/roles/capability-access'
import { legacyRoleToDimensions } from '@/lib/roles/legacy-mapping'
import { COPY } from '@/lib/copy'

/** Cookie für die in der Oberfläche gewählte Rolle (wirkt zusammen mit Profil im Layout). */
export const DEV_ROLE_COOKIE = 'refstack_dev_role'

export type DevRolePreview = {
  systemRole: SystemRole
  functionRole: FunctionRole
}

const SYSTEM_ROLE_SET = new Set<SystemRole>(['owner', 'admin', 'member', 'viewer'])
const FUNCTION_ROLE_SET = new Set<FunctionRole>([
  'sales_rep',
  'account_manager',
  'sales_leader',
])

export function isDevRolePreviewEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_PREVIEW?.trim()
  if (flag === '1') return true
  if (flag === '0') return false
  return process.env.NODE_ENV !== 'production'
}

/** Nur auf Vercel Production eingeschränkt — lokal (dev/start) und Preview-Deploys: alle Nutzer. */
function isVercelProductionDeploy(): boolean {
  return process.env.VERCEL_ENV === 'production'
}

/** Env-Flag + auf Vercel Production nur Owner/Admin (echte DB-Rolle, nicht Preview-Cookie). */
export function canUseDevRolePreview(systemRole: SystemRole): boolean {
  if (!isDevRolePreviewEnabled()) return false
  if (!isVercelProductionDeploy()) return true
  return systemRole === 'owner' || isSystemAdmin(systemRole)
}

export function formatDevRolePreviewLabel(preview: DevRolePreview): string {
  const system = COPY.roleDimensions.systemRoles[preview.systemRole] ?? preview.systemRole
  const fn =
    COPY.roleDimensions.functionRoles[preview.functionRole] ?? preview.functionRole
  return `${system} · ${fn}`
}

export function devRolePreviewKey(preview: DevRolePreview): string {
  return `${preview.systemRole}:${preview.functionRole}`
}

function parseDimensionToken(value: string, allowed: Set<string>): string | null {
  const v = value.trim()
  return allowed.has(v) ? v : null
}

/** Neues Format: `system:function` (z. B. `admin:sales_leader`). Legacy: `admin` | `sales` | `account_manager`. */
export function parseDevRolePreviewCookie(
  value: string | undefined,
): DevRolePreview | null {
  if (!value) return null

  if (value.includes(':')) {
    const [systemRaw, functionRaw] = value.split(':')
    const systemRole = parseDimensionToken(
      systemRaw ?? '',
      SYSTEM_ROLE_SET,
    ) as SystemRole | null
    const functionRole = parseDimensionToken(
      functionRaw ?? '',
      FUNCTION_ROLE_SET,
    ) as FunctionRole | null
    if (systemRole && functionRole) {
      return { systemRole, functionRole }
    }
    return null
  }

  if (value === 'admin' || value === 'sales' || value === 'account_manager') {
    return legacyRoleToDimensions(value)
  }

  return null
}

export function formatDevRolePreviewCookie(preview: DevRolePreview): string {
  return `${preview.systemRole}:${preview.functionRole}`
}

export const DEV_ROLE_PRESETS: DevRolePreview[] = [
  { systemRole: 'owner', functionRole: 'sales_leader' },
  { systemRole: 'admin', functionRole: 'sales_leader' },
  { systemRole: 'admin', functionRole: 'account_manager' },
  { systemRole: 'member', functionRole: 'sales_rep' },
  { systemRole: 'member', functionRole: 'account_manager' },
  { systemRole: 'member', functionRole: 'sales_leader' },
]

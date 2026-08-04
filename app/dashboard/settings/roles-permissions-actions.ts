'use server'

import { revalidatePath } from 'next/cache'

import { writeAuditLog } from '@/lib/audit/log-audit'
import { ROUTES } from '@/lib/routes'
import { FUNCTION_ROLE_CAPS, type Capability, type FunctionRole } from '@/lib/roles/capabilities'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import {
  defaultRolesPermissionsSettings,
  parseRolesPermissionsSettings,
  serializeRolesPermissionsSettings,
  type ApprovalRoutingMode,
  type RolesPermissionsSettings,
} from '@/lib/roles/roles-permissions-settings'
import { asJson } from '@/lib/supabase/db-types'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type ActionResult = { success: true } | { success: false; error: string }

const VISIBILITY_CAPABILITIES: Capability[] = [
  'see_draft_references',
  'see_confidential_references',
]

const FUNCTION_ROLES: FunctionRole[] = ['sales_rep', 'account_manager', 'sales_leader']

async function requireAdminContext() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Nicht angemeldet.' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role, capabilities')
    .eq('id', user.id)
    .single()

  const organizationId = profile?.organization_id ?? null
  if (!organizationId) return { supabase, error: 'Keine Organisation zugeordnet.' as const }

  const roles = parseProfileRoles(profile ?? {})
  if (!isSystemAdmin(roles.systemRole)) {
    return { supabase, error: 'Nur Owner/Admin können Rollen & Rechte verwalten.' as const }
  }

  return { supabase, user, organizationId, error: null as null }
}

export async function getRolesPermissionsSettingsForOrg(): Promise<RolesPermissionsSettings> {
  const ctx = await requireAdminContext()
  if (ctx.error || !ctx.organizationId) return defaultRolesPermissionsSettings()

  const { data: org } = await ctx.supabase
    .from('organizations')
    .select('api_settings')
    .eq('id', ctx.organizationId)
    .single()

  const api =
    org?.api_settings && typeof org.api_settings === 'object'
      ? (org.api_settings as Record<string, unknown>)
      : {}

  return parseRolesPermissionsSettings(api.roles_permissions)
}

export type UpdateRolesPermissionsInput = {
  salesSeesDrafts: boolean
  functionRoleCapabilities: Partial<Record<FunctionRole, Capability[]>>
  approvalRoutingMode: ApprovalRoutingMode
  sensitivityLabels: {
    draft: string
    nda: string
    confidentialSales: string
  }
}

export async function updateRolesPermissionsSettings(
  input: UpdateRolesPermissionsInput
): Promise<ActionResult> {
  const ctx = await requireAdminContext()
  if (ctx.error) return { success: false, error: ctx.error }
  if (!ctx.organizationId || !ctx.user) {
    return { success: false, error: 'Keine Organisation zugeordnet.' }
  }

  const { data: orgRow, error: readErr } = await ctx.supabase
    .from('organizations')
    .select('api_settings')
    .eq('id', ctx.organizationId)
    .single()
  if (readErr) return { success: false, error: readErr.message }

  const prevApi =
    orgRow?.api_settings && typeof orgRow.api_settings === 'object'
      ? (orgRow.api_settings as Record<string, unknown>)
      : {}

  const sanitizedCaps: Partial<Record<FunctionRole, Capability[]>> = {}
  for (const role of FUNCTION_ROLES) {
    const selected = input.functionRoleCapabilities[role]
    if (!selected?.length) continue
    const allowed = new Set(FUNCTION_ROLE_CAPS[role])
    const caps = selected.filter((c) => allowed.has(c) && VISIBILITY_CAPABILITIES.includes(c))
    if (caps.length) sanitizedCaps[role] = caps
  }

  const rolesPermissions = serializeRolesPermissionsSettings({
    sales_sees_drafts: Boolean(input.salesSeesDrafts),
    function_role_capabilities:
      Object.keys(sanitizedCaps).length > 0 ? sanitizedCaps : undefined,
    approval_routing: { mode: input.approvalRoutingMode },
    sensitivity_labels: {
      draft: input.sensitivityLabels.draft.trim() || undefined,
      nda: input.sensitivityLabels.nda.trim() || undefined,
      confidential_sales: input.sensitivityLabels.confidentialSales.trim() || undefined,
    },
  })

  const api_settings = {
    ...prevApi,
    roles_permissions: rolesPermissions,
  }

  const { error } = await ctx.supabase
    .from('organizations')
    .update({
      api_settings: asJson(api_settings),
      updated_at: new Date().toISOString(),
    })
    .eq('id', ctx.organizationId)

  if (error) return { success: false, error: error.message }

  void writeAuditLog({
    orgId: ctx.organizationId,
    userId: ctx.user.id,
    action: 'roles_permissions_updated',
    entityId: ctx.organizationId,
    actionDetails: rolesPermissions,
  })

  revalidatePath(ROUTES.settings)
  return { success: true }
}

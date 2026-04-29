'use server'

import { revalidatePath } from 'next/cache'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type ActionResult = { success: true } | { success: false; error: string }

async function getContext() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, organizationId: null as string | null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  return { supabase, user, organizationId: profile?.organization_id ?? null }
}

export async function updateProfileNotificationSettings(input: {
  emailOnNewMatch: boolean
  emailOnApprovalUpdate: boolean
}): Promise<ActionResult> {
  const { supabase, user } = await getContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const notificationSettings = {
    email_on_new_match: Boolean(input.emailOnNewMatch),
    email_on_approval_update: Boolean(input.emailOnApprovalUpdate),
  }

  const { error } = await supabase
    .from('profiles')
    .update({ notification_settings: notificationSettings })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.settings)
  return { success: true }
}

export async function updateWorkspaceAdminSettings(input: {
  subdomain: string
  apiKeyMask: string
  useWorkspaceBranding: boolean
}): Promise<ActionResult> {
  const { supabase, organizationId } = await getContext()
  if (!organizationId) {
    return { success: false, error: 'Keine Organisation zugeordnet.' }
  }

  const normalizedSubdomain = input.subdomain.trim().toLowerCase()
  if (normalizedSubdomain && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalizedSubdomain)) {
    return { success: false, error: 'Subdomain-Format ungültig.' }
  }

  const updates = {
    subdomain: normalizedSubdomain || null,
    api_settings: {
      workspace_key_mask: input.apiKeyMask.trim() || null,
      use_workspace_branding: Boolean(input.useWorkspaceBranding),
    },
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.settings)
  return { success: true }
}

export async function updateWorkflowSettings(input: {
  linkExpiryDays: number
  requireInternalApproval: boolean
}): Promise<ActionResult> {
  const { supabase, organizationId } = await getContext()
  if (!organizationId) {
    return { success: false, error: 'Keine Organisation zugeordnet.' }
  }

  const safeLinkExpiry = Math.max(1, Math.min(365, Number.isFinite(input.linkExpiryDays) ? Math.trunc(input.linkExpiryDays) : 14))

  const { data: orgRow, error: readErr } = await supabase
    .from('organizations')
    .select('workflow_settings')
    .eq('id', organizationId)
    .single()
  if (readErr) return { success: false, error: readErr.message }

  const prev =
    orgRow?.workflow_settings && typeof orgRow.workflow_settings === 'object'
      ? (orgRow.workflow_settings as Record<string, unknown>)
      : {}
  const workflowSettings = {
    ...prev,
    link_expiry_days: safeLinkExpiry,
    require_internal_approval: Boolean(input.requireInternalApproval),
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      workflow_settings: workflowSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.settings)
  return { success: true }
}

export async function updateWorkspaceSecurityCompliance(input: {
  publicLinkMaxTtlDays: number
  publicLinkRequirePasswordForNew: boolean
}): Promise<ActionResult> {
  const { supabase, user, organizationId } = await getContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  if (!organizationId) {
    return { success: false, error: 'Keine Organisation zugeordnet.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return { success: false, error: 'Nur Workspace-Administratoren können Sicherheitsrichtlinien ändern.' }
  }

  const maxTtl = Math.max(
    7,
    Math.min(3650, Number.isFinite(input.publicLinkMaxTtlDays) ? Math.trunc(input.publicLinkMaxTtlDays) : 365)
  )

  const { data: orgRow, error: readErr } = await supabase
    .from('organizations')
    .select('workflow_settings')
    .eq('id', organizationId)
    .single()
  if (readErr) return { success: false, error: readErr.message }

  const prev =
    orgRow?.workflow_settings && typeof orgRow.workflow_settings === 'object'
      ? (orgRow.workflow_settings as Record<string, unknown>)
      : {}
  const workflowSettings = {
    ...prev,
    public_link_max_ttl_days: maxTtl,
    public_link_require_password_for_new: Boolean(input.publicLinkRequirePasswordForNew),
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      workflow_settings: workflowSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.settings)
  return { success: true }
}


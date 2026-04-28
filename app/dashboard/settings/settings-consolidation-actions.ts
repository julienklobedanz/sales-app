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
  const workflowSettings = {
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


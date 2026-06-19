'use server'

import { revalidatePath } from 'next/cache'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit/log-audit'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'

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

function normalizeDigestLocalTime(raw: string): string {
  const s = raw.trim()
  const m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) return '08:00'
  let h = parseInt(m[1], 10)
  let min = parseInt(m[2], 10)
  if (!Number.isFinite(h)) h = 8
  if (!Number.isFinite(min)) min = 0
  h = Math.max(0, Math.min(23, h))
  min = Math.max(0, Math.min(59, min))
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function normalizeDigestTimezone(raw: string): string {
  const s = raw.trim().slice(0, 64)
  return s || 'Europe/Berlin'
}

export async function updateProfileNotificationSettings(input: {
  emailOnNewMatch: boolean
  emailOnApprovalUpdate: boolean
  emailDailyMarketSignalsDigest: boolean
  emailDigestEmptyDay: boolean
  digestTimezone: string
  digestLocalTime: string
  emailInstantMarketSignals: boolean
  browserPushMarketSignals: boolean
}): Promise<ActionResult> {
  const { supabase, user } = await getContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: existing, error: readErr } = await supabase
    .from('profiles')
    .select('notification_settings')
    .eq('id', user.id)
    .single()
  if (readErr) return { success: false, error: readErr.message }

  const prev =
    existing?.notification_settings && typeof existing.notification_settings === 'object'
      ? (existing.notification_settings as Record<string, unknown>)
      : {}

  const notificationSettings = {
    ...prev,
    email_on_new_match: Boolean(input.emailOnNewMatch),
    email_on_approval_update: Boolean(input.emailOnApprovalUpdate),
    email_daily_market_signals_digest: Boolean(input.emailDailyMarketSignalsDigest),
    email_digest_empty_day: Boolean(input.emailDigestEmptyDay),
    digest_timezone: normalizeDigestTimezone(input.digestTimezone),
    digest_local_time: normalizeDigestLocalTime(input.digestLocalTime),
    email_instant_market_signals: Boolean(input.emailInstantMarketSignals),
    browser_push_market_signals: Boolean(input.browserPushMarketSignals),
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

  const { data: orgRow, error: readErr } = await supabase
    .from('organizations')
    .select('api_settings')
    .eq('id', organizationId)
    .single()
  if (readErr) return { success: false, error: readErr.message }

  const prevApi =
    orgRow?.api_settings && typeof orgRow.api_settings === 'object'
      ? (orgRow.api_settings as Record<string, unknown>)
      : {}

  const updates = {
    subdomain: normalizedSubdomain || null,
    api_settings: {
      ...prevApi,
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
  reminder1Days: number
  reminder2Days: number
  escalationAfterDays: number
  autoNotifyRequesterOnEscalation: boolean
  autoAllowDelegation: boolean
}): Promise<ActionResult> {
  const { supabase, organizationId } = await getContext()
  if (!organizationId) {
    return { success: false, error: 'Keine Organisation zugeordnet.' }
  }

  const safeLinkExpiry = Math.max(1, Math.min(365, Number.isFinite(input.linkExpiryDays) ? Math.trunc(input.linkExpiryDays) : 14))
  const safeReminder1 = Math.max(
    1,
    Math.min(30, Number.isFinite(input.reminder1Days) ? Math.trunc(input.reminder1Days) : 3)
  )
  const safeReminder2 = Math.max(
    safeReminder1,
    Math.min(45, Number.isFinite(input.reminder2Days) ? Math.trunc(input.reminder2Days) : 7)
  )
  const safeEscalationAfter = Math.max(
    safeReminder2,
    Math.min(60, Number.isFinite(input.escalationAfterDays) ? Math.trunc(input.escalationAfterDays) : 10)
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
    link_expiry_days: safeLinkExpiry,
    require_internal_approval: Boolean(input.requireInternalApproval),
    approval_reminder_1_days: safeReminder1,
    approval_reminder_2_days: safeReminder2,
    approval_escalation_after_days: safeEscalationAfter,
    approval_notify_requester_on_escalation: Boolean(input.autoNotifyRequesterOnEscalation),
    approval_allow_delegation: Boolean(input.autoAllowDelegation),
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
  auditLogRetentionDays: number
}): Promise<ActionResult> {
  const { supabase, user, organizationId } = await getContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  if (!organizationId) {
    return { success: false, error: 'Keine Organisation zugeordnet.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role, function_role')
    .eq('id', user.id)
    .single()
  const { systemRole } = parseProfileRoles(profile)
  if (!isSystemAdmin(systemRole)) {
    return { success: false, error: 'Nur Workspace-Administratoren können Sicherheitsrichtlinien ändern.' }
  }

  const maxTtl = Math.max(
    7,
    Math.min(3650, Number.isFinite(input.publicLinkMaxTtlDays) ? Math.trunc(input.publicLinkMaxTtlDays) : 365)
  )
  const retentionDays = Math.max(
    30,
    Math.min(3650, Number.isFinite(input.auditLogRetentionDays) ? Math.trunc(input.auditLogRetentionDays) : 365)
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
    audit_log_retention_days: retentionDays,
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      workflow_settings: workflowSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (error) return { success: false, error: error.message }
  const retentionCutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('audit_logs')
    .delete()
    .eq('org_id', organizationId)
    .lt('timestamp', retentionCutoff)
  void writeAuditLog({
    orgId: organizationId,
    userId: user.id,
    action: 'security_policy_updated',
    entityId: organizationId,
    actionDetails: {
      public_link_max_ttl_days: maxTtl,
      public_link_require_password_for_new: Boolean(input.publicLinkRequirePasswordForNew),
      audit_log_retention_days: retentionDays,
    },
  })
  revalidatePath(ROUTES.settings)
  return { success: true }
}

const HIGHLIGHT_GLOSSARY_MAX_LEN = 4000

export async function updateWorkspaceReferenceHighlightGlossary(raw: string): Promise<ActionResult> {
  const { supabase, user, organizationId } = await getContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  if (!organizationId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role, function_role')
    .eq('id', user.id)
    .single()
  const { systemRole } = parseProfileRoles(profile)
  if (!isSystemAdmin(systemRole)) {
    return { success: false, error: 'Nur Workspace-Administratoren können das Glossar bearbeiten.' }
  }

  const glossary = String(raw ?? '').slice(0, HIGHLIGHT_GLOSSARY_MAX_LEN)

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
    reference_highlight_glossary: glossary.trim() ? glossary : null,
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
  revalidatePath(ROUTES.evidence.root)
  return { success: true }
}


import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { DEV_ROLE_COOKIE, canUseDevRolePreview, parseDevRolePreviewCookie } from '@/lib/dev-role-preview'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { legacyAppRoleFrom } from '@/lib/roles/legacy-mapping'
import { isSalesAppView } from '@/lib/roles/reference-access'
import { parseRolesPermissionsSettings } from '@/lib/roles/roles-permissions-settings'
import { DEFAULT_DIGEST_LOCAL_TIME, DEFAULT_DIGEST_TIMEZONE } from '@/lib/market-signals/digest-schedule'
import { getTeamMembers } from './invite-actions'
import { SettingsTabs } from './settings-tabs'
import { getOrganizationCrmConnectionPublicStatus } from '@/lib/crm/connections'
import { isHubSpotConfigured } from '@/lib/crm/hubspot/config'

type AuditLogRow = {
  id: string
  action: string
  entity_id: string | null
  action_details: Record<string, unknown> | null
  timestamp: string
  user_id: string | null
}

function parseExportSettings(raw: unknown): { pdf_layout?: 'one_pager' | 'detail' | 'anonymized'; pdf_logo_enabled?: boolean } {
  if (!raw || typeof raw !== 'object') return {}
  const obj = raw as Record<string, unknown>
  const layout = obj.pdf_layout
  const logo = obj.pdf_logo_enabled
  return {
    pdf_layout:
      layout === 'detail' || layout === 'anonymized' || layout === 'one_pager'
        ? layout
        : undefined,
    pdf_logo_enabled: typeof logo === 'boolean' ? logo : undefined,
  }
}

function parseProfileNotificationSettings(raw: unknown): {
  emailOnNewMatch: boolean
  emailOnApprovalUpdate: boolean
  emailDailyMarketSignalsDigest: boolean
  emailDigestEmptyDay: boolean
  digestTimezone: string
  digestLocalTime: string
  emailInstantMarketSignals: boolean
  browserPushMarketSignals: boolean
} {
  if (!raw || typeof raw !== 'object') {
    return {
      emailOnNewMatch: true,
      emailOnApprovalUpdate: true,
      emailDailyMarketSignalsDigest: false,
      emailDigestEmptyDay: false,
      digestTimezone: DEFAULT_DIGEST_TIMEZONE,
      digestLocalTime: DEFAULT_DIGEST_LOCAL_TIME,
      emailInstantMarketSignals: false,
      browserPushMarketSignals: false,
    }
  }
  const obj = raw as Record<string, unknown>
  const tzRaw = typeof obj.digest_timezone === 'string' ? obj.digest_timezone.trim() : ''
  const timeRaw = typeof obj.digest_local_time === 'string' ? obj.digest_local_time.trim() : ''
  return {
    emailOnNewMatch:
      typeof obj.email_on_new_match === 'boolean' ? obj.email_on_new_match : true,
    emailOnApprovalUpdate:
      typeof obj.email_on_approval_update === 'boolean'
        ? obj.email_on_approval_update
        : true,
    emailDailyMarketSignalsDigest:
      typeof obj.email_daily_market_signals_digest === 'boolean'
        ? obj.email_daily_market_signals_digest
        : false,
    emailDigestEmptyDay:
      typeof obj.email_digest_empty_day === 'boolean' ? obj.email_digest_empty_day : false,
    digestTimezone: tzRaw || DEFAULT_DIGEST_TIMEZONE,
    digestLocalTime: timeRaw || DEFAULT_DIGEST_LOCAL_TIME,
    emailInstantMarketSignals:
      typeof obj.email_instant_market_signals === 'boolean' ? obj.email_instant_market_signals : false,
    browserPushMarketSignals:
      typeof obj.browser_push_market_signals === 'boolean' ? obj.browser_push_market_signals : false,
  }
}

function parseOrganizationWorkflowSettings(raw: unknown): {
  linkExpiryDays: number
  requireInternalApproval: boolean
  reminder1Days: number
  reminder2Days: number
  escalationAfterDays: number
  autoNotifyRequesterOnEscalation: boolean
  autoAllowDelegation: boolean
  publicLinkMaxTtlDays: number
  publicLinkRequirePasswordForNew: boolean
  auditLogRetentionDays: number
  referenceHighlightGlossary: string
} {
  if (!raw || typeof raw !== 'object') {
    return {
      linkExpiryDays: 14,
      requireInternalApproval: true,
      reminder1Days: 3,
      reminder2Days: 7,
      escalationAfterDays: 10,
      autoNotifyRequesterOnEscalation: true,
      autoAllowDelegation: true,
      publicLinkMaxTtlDays: 365,
      publicLinkRequirePasswordForNew: false,
      auditLogRetentionDays: 365,
      referenceHighlightGlossary: '',
    }
  }
  const obj = raw as Record<string, unknown>
  const linkExpiryDaysRaw = obj.link_expiry_days
  const reminder1Raw = obj.approval_reminder_1_days
  const reminder2Raw = obj.approval_reminder_2_days
  const escalationRaw = obj.approval_escalation_after_days
  const maxTtlRaw = obj.public_link_max_ttl_days
  const retentionRaw = obj.audit_log_retention_days
  const glossaryRaw = obj.reference_highlight_glossary
  return {
    linkExpiryDays:
      typeof linkExpiryDaysRaw === 'number' && Number.isFinite(linkExpiryDaysRaw)
        ? Math.max(1, Math.min(365, Math.trunc(linkExpiryDaysRaw)))
        : 14,
    requireInternalApproval:
      typeof obj.require_internal_approval === 'boolean'
        ? obj.require_internal_approval
        : true,
    reminder1Days:
      typeof reminder1Raw === 'number' && Number.isFinite(reminder1Raw)
        ? Math.max(1, Math.min(30, Math.trunc(reminder1Raw)))
        : 3,
    reminder2Days:
      typeof reminder2Raw === 'number' && Number.isFinite(reminder2Raw)
        ? Math.max(1, Math.min(45, Math.trunc(reminder2Raw)))
        : 7,
    escalationAfterDays:
      typeof escalationRaw === 'number' && Number.isFinite(escalationRaw)
        ? Math.max(1, Math.min(60, Math.trunc(escalationRaw)))
        : 10,
    autoNotifyRequesterOnEscalation: obj.approval_notify_requester_on_escalation !== false,
    autoAllowDelegation: obj.approval_allow_delegation !== false,
    publicLinkMaxTtlDays:
      typeof maxTtlRaw === 'number' && Number.isFinite(maxTtlRaw)
        ? Math.max(7, Math.min(3650, Math.trunc(maxTtlRaw)))
        : 365,
    publicLinkRequirePasswordForNew: obj.public_link_require_password_for_new === true,
    auditLogRetentionDays:
      typeof retentionRaw === 'number' && Number.isFinite(retentionRaw)
        ? Math.max(30, Math.min(3650, Math.trunc(retentionRaw)))
        : 365,
    referenceHighlightGlossary:
      typeof glossaryRaw === 'string' ? glossaryRaw : '',
  }
}

function parseOrganizationApiSettings(raw: unknown): {
  apiKeyMask: string
  useWorkspaceBranding: boolean
  rolesPermissions: ReturnType<typeof parseRolesPermissionsSettings>
} {
  if (!raw || typeof raw !== 'object') {
    return {
      apiKeyMask: 'sk_live_************************',
      useWorkspaceBranding: false,
      rolesPermissions: parseRolesPermissionsSettings(null),
    }
  }
  const obj = raw as Record<string, unknown>
  return {
    apiKeyMask:
      typeof obj.workspace_key_mask === 'string' && obj.workspace_key_mask.trim()
        ? obj.workspace_key_mask.trim()
        : 'sk_live_************************',
    useWorkspaceBranding: typeof obj.use_workspace_branding === 'boolean' ? obj.use_workspace_branding : false,
    rolesPermissions: parseRolesPermissionsSettings(obj.roles_permissions),
  }
}

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.login)

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*, notification_settings')
    .eq('id', user.id)
    .single()

  const organizationId = profileRow?.organization_id ?? null
  let orgRow: {
    id: string
    name: string
    logo_url: string | null
    primary_color: string | null
    secondary_color: string | null
    date_display_format: string
    export_settings: unknown
    stripe_subscription_id: string | null
    subscription_status: string | null
    subdomain: string | null
    api_settings: unknown
    workflow_settings: unknown
  } | null = null
  if (organizationId) {
    const { data } = await supabase
      .from('organizations')
      .select(
        'id, name, logo_url, primary_color, secondary_color, date_display_format, export_settings, stripe_subscription_id, subscription_status, subdomain, api_settings, workflow_settings'
      )
      .eq('id', organizationId)
      .single()
    orgRow = data
  }

  const teamMembers = await getTeamMembers()

  const cookieStore = await cookies()
  const serverRoles = parseProfileRoles(profileRow)
  const devRolePreviewEnabled = canUseDevRolePreview(serverRoles.systemRole)
  const previewRoles = devRolePreviewEnabled
    ? parseDevRolePreviewCookie(cookieStore.get(DEV_ROLE_COOKIE)?.value)
    : null
  const isAdmin = isSystemAdmin(serverRoles.systemRole)
  const hubspotConfigured = isHubSpotConfigured()
  const hubspotStatus =
    isAdmin && organizationId
      ? await getOrganizationCrmConnectionPublicStatus(supabase, organizationId, 'hubspot')
      : { connected: false, externalAccountId: null, lastSyncAt: null }
  const auditLogs: AuditLogRow[] =
    isAdmin && organizationId
      ? (
          (await supabase
            .from('audit_logs')
            .select('id, action, entity_id, action_details, timestamp, user_id')
            .eq('org_id', organizationId)
            .order('timestamp', { ascending: false })
            .limit(200)).data ?? []
        ).map((row) => ({
          id: row.id,
          action: row.action,
          entity_id: row.entity_id,
          action_details:
            row.action_details &&
            typeof row.action_details === 'object' &&
            !Array.isArray(row.action_details)
              ? (row.action_details as Record<string, unknown>)
              : null,
          timestamp: row.timestamp,
          user_id: row.user_id,
        }))
      : []

  const fullName = profileRow?.full_name ?? ''
  const [firstName = '', ...rest] = fullName.trim().split(/\s+/)
  const lastName = rest.join(' ') ?? ''

  const apiSettingsParsed = parseOrganizationApiSettings(
    (orgRow as { api_settings?: unknown } | null)?.api_settings
  )

  return (
    <div className="flex flex-col space-y-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted/40" />}>
        <SettingsTabs
        devRolePreviewEnabled={devRolePreviewEnabled}
        roleSwitcher={{
          serverRoles: {
            systemRole: serverRoles.systemRole,
            functionRole: serverRoles.functionRole,
          },
          previewRoles,
          isServerAdmin: isAdmin,
        }}
        profile={{
          userEmail: user.email ?? '',
          firstName,
          lastName,
          avatarUrl: (profileRow as { avatar_url?: string | null })?.avatar_url ?? null,
          bookingUrl: (profileRow as { booking_url?: string | null })?.booking_url ?? null,
          phone: (profileRow as { phone?: string | null })?.phone ?? null,
          profileRole: legacyAppRoleFrom(serverRoles.systemRole, serverRoles.functionRole),
          notificationSettings: parseProfileNotificationSettings(
            (profileRow as { notification_settings?: unknown } | null)?.notification_settings
          ),
        }}
        org={{
          id: orgRow?.id ?? null,
          name: orgRow?.name ?? '',
          logoUrl: orgRow?.logo_url ?? null,
          primaryColor:
            (orgRow as { primary_color?: string | null } | null)?.primary_color ??
            '#2563EB',
          secondaryColor:
            (orgRow as { secondary_color?: string | null } | null)
              ?.secondary_color ?? '#1D4ED8',
          dateDisplayFormat:
            (orgRow as { date_display_format?: string | null } | null)?.date_display_format ??
            'de-DE',
          exportSettings: parseExportSettings(
            (orgRow as { export_settings?: unknown } | null)?.export_settings
          ),
          subscriptionStatus: orgRow?.subscription_status ?? null,
          subscriptionId: orgRow?.stripe_subscription_id ?? null,
          subdomain:
            (orgRow as { subdomain?: string | null } | null)?.subdomain ?? '',
          apiSettings: {
            apiKeyMask: apiSettingsParsed.apiKeyMask,
            useWorkspaceBranding: apiSettingsParsed.useWorkspaceBranding,
          },
          workflowSettings: parseOrganizationWorkflowSettings(
            (orgRow as { workflow_settings?: unknown } | null)?.workflow_settings
          ),
        }}
        teamMembers={teamMembers}
        auditLogs={auditLogs}
        hubspotIntegration={{
          configured: hubspotConfigured,
          connected: hubspotStatus.connected,
          canManage: isAdmin,
          externalAccountId: hubspotStatus.externalAccountId,
          lastSyncAt: hubspotStatus.lastSyncAt,
        }}
        rolesPermissions={apiSettingsParsed.rolesPermissions}
        />
      </Suspense>
    </div>
  )
}

import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import type { AppRole } from '@/hooks/useRole'
import { DEV_ROLE_COOKIE, parseAppRoleCookie } from '@/lib/dev-role-preview'
import { getTeamMembers } from './invite-actions'
import { SettingsTabs } from './settings-tabs'

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
} {
  if (!raw || typeof raw !== 'object') {
    return { emailOnNewMatch: true, emailOnApprovalUpdate: true }
  }
  const obj = raw as Record<string, unknown>
  return {
    emailOnNewMatch:
      typeof obj.email_on_new_match === 'boolean' ? obj.email_on_new_match : true,
    emailOnApprovalUpdate:
      typeof obj.email_on_approval_update === 'boolean'
        ? obj.email_on_approval_update
        : true,
  }
}

function parseOrganizationWorkflowSettings(raw: unknown): {
  linkExpiryDays: number
  requireInternalApproval: boolean
} {
  if (!raw || typeof raw !== 'object') {
    return { linkExpiryDays: 14, requireInternalApproval: true }
  }
  const obj = raw as Record<string, unknown>
  const linkExpiryDaysRaw = obj.link_expiry_days
  return {
    linkExpiryDays:
      typeof linkExpiryDaysRaw === 'number' && Number.isFinite(linkExpiryDaysRaw)
        ? Math.max(1, Math.min(365, Math.trunc(linkExpiryDaysRaw)))
        : 14,
    requireInternalApproval:
      typeof obj.require_internal_approval === 'boolean'
        ? obj.require_internal_approval
        : true,
  }
}

function parseOrganizationApiSettings(raw: unknown): { apiKeyMask: string; useWorkspaceBranding: boolean } {
  if (!raw || typeof raw !== 'object') return { apiKeyMask: 'sk_live_************************', useWorkspaceBranding: false }
  const obj = raw as Record<string, unknown>
  return {
    apiKeyMask:
      typeof obj.workspace_key_mask === 'string' && obj.workspace_key_mask.trim()
        ? obj.workspace_key_mask.trim()
        : 'sk_live_************************',
    useWorkspaceBranding: typeof obj.use_workspace_branding === 'boolean' ? obj.use_workspace_branding : false,
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
  const { data: orgRow } =
    organizationId &&
    (await supabase
      .from('organizations')
      .select('id, name, logo_url, primary_color, secondary_color, export_settings, stripe_subscription_id, subscription_status, subdomain, api_settings, workflow_settings')
      .eq('id', organizationId)
      .single())

  const teamMembers = await getTeamMembers()

  const cookieStore = await cookies()
  const previewRole = parseAppRoleCookie(cookieStore.get(DEV_ROLE_COOKIE)?.value)
  const serverRole = (profileRow?.role ?? 'sales') as AppRole

  const fullName = profileRow?.full_name ?? ''
  const [firstName = '', ...rest] = fullName.trim().split(/\s+/)
  const lastName = rest.join(' ') ?? ''

  return (
    <div className="flex flex-col space-y-6">
      <SettingsTabs
        roleSwitcher={{ serverRole, previewRole }}
        profile={{
          userEmail: user.email ?? '',
          firstName,
          lastName,
          avatarUrl: (profileRow as { avatar_url?: string | null })?.avatar_url ?? null,
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
          exportSettings: parseExportSettings(
            (orgRow as { export_settings?: unknown } | null)?.export_settings
          ),
          subscriptionStatus: orgRow?.subscription_status ?? null,
          subscriptionId: orgRow?.stripe_subscription_id ?? null,
          subdomain:
            (orgRow as { subdomain?: string | null } | null)?.subdomain ?? '',
          apiSettings: parseOrganizationApiSettings(
            (orgRow as { api_settings?: unknown } | null)?.api_settings
          ),
          workflowSettings: parseOrganizationWorkflowSettings(
            (orgRow as { workflow_settings?: unknown } | null)?.workflow_settings
          ),
        }}
        teamMembers={teamMembers}
      />
    </div>
  )
}

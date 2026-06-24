import { isDevRolePreviewEnabled } from '@/lib/dev-role-preview'
import { getRequestEffectiveRoles, getRequestUser } from '@/lib/auth/request-user'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DashboardShell } from './dashboard-shell'
import { DashboardMfaGate } from '@/components/dashboard/DashboardMfaGate'
import { getInboxNotificationsForLayout } from './actions'

function sanitizeHexColor(raw: unknown) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const withHash = s.startsWith('#') ? s : `#${s}`
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toUpperCase()
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) return withHash.toUpperCase()
  return null
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getRequestUser()
  if (!user) {
    redirect(ROUTES.login)
  }

  const effective = await getRequestEffectiveRoles()
  if (!effective) {
    redirect(ROUTES.onboarding)
  }

  const { profile, effectiveRole, systemRole: effectiveSystemRole, functionRole: effectiveFunctionRole, capabilities: effectiveCapabilities } = effective

  const initialNotifications = await getInboxNotificationsForLayout(user.id, effectiveRole)

  const orgId = profile.organization_id ?? null
  let workspaceBranding: { enabled: boolean; primary: string; secondary: string } | null = null
  if (orgId) {
    const supabase = await createServerSupabaseClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('primary_color, secondary_color, api_settings')
      .eq('id', orgId)
      .maybeSingle()

    const apiSettings = (org as { api_settings?: unknown } | null)?.api_settings
    const useWorkspaceBranding =
      apiSettings && typeof apiSettings === 'object'
        ? Boolean((apiSettings as Record<string, unknown>).use_workspace_branding)
        : false
    const primary = sanitizeHexColor((org as { primary_color?: unknown } | null)?.primary_color) ?? '#2563EB'
    const secondary = sanitizeHexColor((org as { secondary_color?: unknown } | null)?.secondary_color) ?? '#1D4ED8'
    workspaceBranding = { enabled: useWorkspaceBranding, primary, secondary }
  }

  return (
    <DashboardShell
      user={user}
      profile={{
        full_name: profile.full_name,
        role: effectiveRole,
        systemRole: effectiveSystemRole,
        functionRole: effectiveFunctionRole,
        capabilities: effectiveCapabilities,
      }}
      initialNotifications={initialNotifications}
      workspaceBranding={workspaceBranding}
      devRolePreviewEnabled={isDevRolePreviewEnabled()}
    >
      <DashboardMfaGate>{children}</DashboardMfaGate>
    </DashboardShell>
  )
}

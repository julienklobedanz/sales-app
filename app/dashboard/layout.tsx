import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AppRole } from '@/hooks/useRole'
import { DEV_ROLE_COOKIE, parseAppRoleCookie } from '@/lib/dev-role-preview'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { DashboardShell } from './dashboard-shell'
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
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(ROUTES.login)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect(ROUTES.onboarding)
  }

  const cookieStore = await cookies()
  const previewRole = parseAppRoleCookie(cookieStore.get(DEV_ROLE_COOKIE)?.value)
  const serverRole = profile.role as AppRole
  const effectiveRole: AppRole = previewRole ?? serverRole

  const initialNotifications = await getInboxNotificationsForLayout(user.id, effectiveRole)

  const orgId = (profile as { organization_id?: string | null }).organization_id ?? null
  let workspaceBranding: { enabled: boolean; primary: string; secondary: string } | null = null
  if (orgId) {
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
      profile={{ ...profile, role: effectiveRole }}
      initialNotifications={initialNotifications}
      workspaceBranding={workspaceBranding}
    >
      {children}
    </DashboardShell>
  )
}

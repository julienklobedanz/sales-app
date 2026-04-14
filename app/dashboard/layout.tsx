import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AppRole } from '@/hooks/useRole'
import {
  DEV_ROLE_COOKIE,
  isDevRolePreviewEnabled,
  parseAppRoleCookie,
} from '@/lib/dev-role-preview'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { DashboardShell } from './dashboard-shell'

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

  const devSwitcher = isDevRolePreviewEnabled()
  const cookieStore = await cookies()
  const previewRole = devSwitcher
    ? parseAppRoleCookie(cookieStore.get(DEV_ROLE_COOKIE)?.value)
    : null
  const serverRole = profile.role as AppRole
  const effectiveRole: AppRole = previewRole ?? serverRole

  return (
    <DashboardShell
      user={user}
      profile={{ ...profile, role: effectiveRole }}
      devRoleSwitcherEnabled={devSwitcher}
    >
      {children}
    </DashboardShell>
  )
}

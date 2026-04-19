import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AppRole } from '@/hooks/useRole'
import { DEV_ROLE_COOKIE, parseAppRoleCookie } from '@/lib/dev-role-preview'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { DashboardShell } from './dashboard-shell'
import { getInboxNotificationsForLayout } from './actions'

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

  return (
    <DashboardShell
      user={user}
      profile={{ ...profile, role: effectiveRole }}
      initialNotifications={initialNotifications}
    >
      {children}
    </DashboardShell>
  )
}

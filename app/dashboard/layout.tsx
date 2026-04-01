import { createServerSupabaseClient } from '@/lib/supabase/server'
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

  return (
    <DashboardShell user={user} profile={profile}>
      {children}
    </DashboardShell>
  )
}

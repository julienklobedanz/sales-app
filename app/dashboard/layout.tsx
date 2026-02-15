import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from './dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const showAdmin =
    (user.app_metadata?.role as string) === 'admin' ||
    (user.user_metadata?.role as string) === 'admin'

  return <DashboardShell showAdmin={!!showAdmin}>{children}</DashboardShell>
}

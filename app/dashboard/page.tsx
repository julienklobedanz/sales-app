import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/routes'
import { CommandCenter } from '@/components/dashboard/command-center'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(ROUTES.login)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) {
    redirect(ROUTES.onboarding)
  }

  return <CommandCenter greetingName={profile.full_name as string | null} />
}

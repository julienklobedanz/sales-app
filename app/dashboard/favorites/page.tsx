import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardData } from '../actions'
import { DashboardOverview } from '../dashboard-overview'
import type { Profile } from '../dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function FavoritesPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  const { references, totalCount } = await getDashboardData(true)

  if (references.length === 0) {
    return (
      <div className="flex flex-col gap-4 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Favoriten</h2>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p>Du hast noch keine Referenzen favorisiert.</p>
          <p className="mt-2 text-sm">
            Klicke auf den Stern in der Übersicht, um Referenzen hier zu speichern.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DashboardOverview
      references={references}
      totalCount={totalCount}
      profile={profile as Profile}
      title="Favoriten"
    />
  )
}

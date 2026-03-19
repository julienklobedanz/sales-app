import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AiLabClient } from './ai-lab-client'
import {
  getUnreadAlertCount,
  getUnreadAlertsByType,
} from './actions'

export default async function AiLabPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const [companiesResult, unreadCount, badgeCounts] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name')
      .eq('organization_id', profile.organization_id ?? '')
      .order('name'),
    getUnreadAlertCount(),
    getUnreadAlertsByType(),
  ])

  const companies = (companiesResult.data ?? []).map((c) => ({
    id: c.id,
    name: c.name ?? 'Unbenannt',
  }))

  return (
    <div className="flex flex-col space-y-6 px-6 pt-6 md:px-12 lg:px-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          RFP-Analyzer, Relationship Intelligence, Executive Briefings und Market Signals – KI-Tools für deine Accounts.
        </p>
      </div>
      <AiLabClient
        companies={companies}
        unreadAlertsCount={unreadCount}
        execMovementBadge={badgeCounts.execMovement}
        companyNewsBadge={badgeCounts.companyNews}
      />
    </div>
  )
}

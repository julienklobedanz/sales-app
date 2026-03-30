import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDashboardData } from '@/app/dashboard/actions'
import { EvidenceClient } from './evidence-client'

export const dynamic = 'force-dynamic'

export default async function EvidenceHubPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const dashboard = await getDashboardData(false)

  const role = (profile as { role?: 'admin' | 'sales' | 'account_manager' }).role ?? 'sales'

  const references =
    role === 'sales'
      ? dashboard.references.filter((r) => r.status === 'approved' || r.status === 'internal_only')
      : dashboard.references

  return <EvidenceClient references={references} role={role} />
}


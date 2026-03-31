import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RequestNewClient } from './request-new-client'

export const dynamic = 'force-dynamic'

export default async function DealReferenceRequestNewPage() {
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
  if (!profile?.organization_id) redirect('/onboarding')

  const { data: deals } = await supabase
    .from('deals')
    .select('id, title')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col space-y-6 px-6 pt-6 md:px-12 lg:px-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Referenzanfrage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deal auswählen und kurz beschreiben, welche Referenz benötigt wird.
        </p>
      </div>
      <RequestNewClient deals={(deals ?? []) as Array<{ id: string; title: string }>} />
    </div>
  )
}


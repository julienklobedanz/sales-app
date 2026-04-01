import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { RequestNewClient } from './request-new-client'

export const dynamic = 'force-dynamic'

export default async function DealReferenceRequestNewPage({
  searchParams,
}: {
  searchParams: Promise<{ dealId?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) redirect(ROUTES.onboarding)

  const { data: deals } = await supabase
    .from('deals')
    .select('id, title')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  const params = await searchParams
  const initialDealId = typeof params.dealId === 'string' ? params.dealId : null

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Referenzanfrage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deal auswählen und kurz beschreiben, welche Referenz benötigt wird.
        </p>
      </div>
      <RequestNewClient
        deals={(deals ?? []) as Array<{ id: string; title: string }>}
        initialDealId={initialDealId}
      />
    </div>
  )
}


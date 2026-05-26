export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { redirect } from 'next/navigation'

import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DealDeskClient } from './deal-desk-client'

function DealDeskLoading() {
  return (
    <div className="mx-auto flex min-h-[320px] w-full max-w-6xl items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
    </div>
  )
}

export default async function DealDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>
}) {
  const sp = await searchParams
  const runDemoOnMount = sp.demo === '1'

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) {
    redirect(ROUTES.onboarding)
  }

  return (
    <Suspense fallback={<DealDeskLoading />}>
      <DealDeskClient runDemoOnMount={runDemoOnMount} />
    </Suspense>
  )
}

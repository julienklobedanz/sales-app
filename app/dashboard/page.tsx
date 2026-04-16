import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) {
    redirect(ROUTES.onboarding)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Das Dashboard wird in <strong>E11</strong> als rollenbasierte Startseite umgesetzt.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="default">
          <Link href={ROUTES.evidence.root}>Zu {COPY.nav.evidence}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.accounts}>Zu Accounts</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={ROUTES.deals.root}>Zu Deals</Link>
        </Button>
      </div>
    </div>
  )
}

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col gap-6 px-6 pt-6 md:px-12 lg:px-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Das Dashboard wird in <strong>E11</strong> als rollenbasierte Startseite umgesetzt.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="default">
          <Link href="/dashboard/evidence">Zum Evidence Hub</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/accounts">Zu Accounts</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/deals">Zu Deals</Link>
        </Button>
      </div>
    </div>
  )
}

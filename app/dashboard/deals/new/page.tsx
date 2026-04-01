import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from '@hugeicons/core-free-icons'
import { DealForm } from './deal-form'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'

export default async function NewDealPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) redirect(ROUTES.onboarding)

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name')

  const { data: orgProfiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('organization_id', orgId)
    .order('full_name')

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href={ROUTES.deals.root}>
          <Button variant="ghost" size="sm" className="-ml-2 gap-2">
            <AppIcon icon={ArrowLeftIcon} size={16} />
            Zurück zu Deals
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Deal anlegen</h1>
        <DealForm
          companies={companies ?? []}
          orgProfiles={orgProfiles ?? []}
        />
      </div>
    </div>
  )
}

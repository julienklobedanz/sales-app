export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function DealDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; project?: string }>
}) {
  const sp = await searchParams
  const projectId = sp.project?.trim()

  if (projectId) {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle()

      const orgId = profile?.organization_id
      if (orgId) {
        const { data: project } = await supabase
          .from('deal_desk_projects')
          .select('deal_id')
          .eq('id', projectId)
          .eq('organization_id', orgId)
          .maybeSingle()

        const dealId = (project as { deal_id?: string | null } | null)?.deal_id
        if (dealId) {
          redirect(ROUTES.deals.detailTab(dealId, 'desk'))
        }
      }
    }
  }

  redirect(ROUTES.deals.root)
}

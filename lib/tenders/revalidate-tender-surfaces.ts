import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

import { revalidateDealWorkspacePaths } from '@/lib/deals/revalidate-deal-workspace-paths'
import type { Database } from '@/lib/database.types'
import { ROUTES } from '@/lib/routes'

type Client = SupabaseClient<Database>

/** Liste, Ausschreibungsseite und alle Lose (plus optional ein bereits abgehängtes Los). */
export async function revalidateTenderSurfaces(
  supabase: Client,
  args: {
    organizationId: string
    tenderId: string | null
    extraDealId?: string
  },
) {
  revalidatePath(ROUTES.deals.root)
  if (args.extraDealId) revalidateDealWorkspacePaths(args.extraDealId)
  if (!args.tenderId) return

  revalidatePath(ROUTES.tenders.detail(args.tenderId), 'page')

  const { data: lots } = await supabase
    .from('deals')
    .select('id')
    .eq('tender_id', args.tenderId)
    .eq('organization_id', args.organizationId)

  for (const lot of lots ?? []) {
    if (lot.id === args.extraDealId) continue
    revalidateDealWorkspacePaths(lot.id)
  }
}

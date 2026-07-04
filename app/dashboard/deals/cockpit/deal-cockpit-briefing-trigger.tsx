import { createServerSupabaseClient } from '@/lib/supabase/server'
import { loadDealExecutiveBriefingContext } from '@/lib/deal-desk/load-deal-executive-briefing'

import { DealExecutiveBriefingDialog } from './deal-executive-briefing-dialog'

export async function DealCockpitBriefingTrigger({
  dealId,
  orgId,
}: {
  dealId: string
  orgId: string
}) {
  const supabase = await createServerSupabaseClient()
  const briefing = await loadDealExecutiveBriefingContext(supabase, orgId, dealId)

  if (!briefing) return null

  return (
    <DealExecutiveBriefingDialog
      dealId={dealId}
      projectName={briefing.projectName}
      analysis={briefing.analysis}
      redFlags={briefing.redFlags}
    />
  )
}

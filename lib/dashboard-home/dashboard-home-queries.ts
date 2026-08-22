import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReferenceKpiCounts } from '@/lib/dashboard-home/dashboard-home-types'
import { loadReferenceKpisForOrg } from '@/lib/cache/cached-org-reads'

export async function loadReferenceKpis(
  supabase: SupabaseClient,
  orgId: string,
): Promise<ReferenceKpiCounts> {
  return loadReferenceKpisForOrg(supabase, orgId)
}

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { extractDealRfpSectionData } from '@/lib/deal-desk/analysis-snapshot'
import type { DealRfpSectionData } from '@/lib/deal-desk/analysis-snapshot'

/** Lädt die letzte abgeschlossene RFP-Analyse eines Deals aus dem verknüpften Deal-Desk-Projekt. */
export async function loadDealRfpSectionDataForDeal(
  supabase: SupabaseClient,
  organizationId: string,
  dealId: string
): Promise<DealRfpSectionData | null> {
  const { data: project, error } = await supabase
    .from('deal_desk_projects')
    .select('id, analysis_status, analysis_snapshot')
    .eq('organization_id', organizationId)
    .eq('deal_id', dealId)
    .eq('analysis_status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !project?.id) return null
  return extractDealRfpSectionData(String(project.id), project.analysis_snapshot)
}

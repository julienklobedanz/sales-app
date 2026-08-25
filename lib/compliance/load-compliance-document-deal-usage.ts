import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildComplianceDocumentDealUsage,
  type ComplianceDocumentUsageById,
  type ComplianceDocumentUsageLink,
} from '@/lib/compliance/build-compliance-document-deal-usage'
import type { Database } from '@/lib/database.types'

export async function loadComplianceDocumentDealUsage(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<ComplianceDocumentUsageById> {
  const { data: linkRows, error: linkError } = await supabase
    .from('deal_rfp_requirement_documents')
    .select('document_id, requirement_id')
    .eq('organization_id', organizationId)

  if (linkError || !linkRows?.length) return {}

  const requirementIds = [...new Set(linkRows.map((row) => row.requirement_id))]
  const { data: requirementRows, error: reqError } = await supabase
    .from('deal_rfp_requirements')
    .select('id, deal_id, text')
    .eq('organization_id', organizationId)
    .in('id', requirementIds)

  if (reqError || !requirementRows?.length) return {}

  const byRequirement = new Map(
    requirementRows.map((row) => [
      row.id,
      { dealId: row.deal_id, text: String(row.text ?? '') },
    ]),
  )
  const dealIds = [...new Set(requirementRows.map((row) => row.deal_id))]
  const { data: dealRows, error: dealError } = await supabase
    .from('deals')
    .select('id, title')
    .eq('organization_id', organizationId)
    .in('id', dealIds)

  if (dealError || !dealRows) return {}

  const dealTitle = new Map(
    dealRows.map((row) => [row.id, String(row.title ?? '').trim() || row.id]),
  )

  const links: ComplianceDocumentUsageLink[] = []
  for (const row of linkRows) {
    const requirement = byRequirement.get(row.requirement_id)
    if (!requirement) continue
    const title = dealTitle.get(requirement.dealId)
    if (!title) continue
    links.push({
      documentId: row.document_id,
      dealId: requirement.dealId,
      dealTitle: title,
      requirementId: row.requirement_id,
      requirementText: requirement.text,
    })
  }

  return buildComplianceDocumentDealUsage(links)
}

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import type { RequirementLinkPickDoc } from '@/lib/deals/requirement-link-types'

export async function loadOrgComplianceDocsForRequirementLink(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<RequirementLinkPickDoc[]> {
  const { data, error } = await supabase
    .from('organization_compliance_documents')
    .select('id, title, document_type, valid_until')
    .eq('organization_id', organizationId)
    .eq('is_current', true)
    .order('title', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    title: String(row.title ?? ''),
    documentType: String(row.document_type ?? ''),
    validUntil: (row.valid_until as string | null) ?? null,
  }))
}

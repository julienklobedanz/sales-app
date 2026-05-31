import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { OrgComplianceDoc } from '@/lib/deal-desk/compute-delivery-win-probability'

/** Aktuelle Compliance-/Nachweis-Dokumente der Organisation (Evidence Library). */
export async function loadOrgComplianceDocsForDelivery(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrgComplianceDoc[]> {
  const { data, error } = await supabase
    .from('organization_compliance_documents')
    .select('document_type, title, valid_until, file_storage_path')
    .eq('organization_id', organizationId)
    .eq('is_current', true)

  if (error) {
    console.error('loadOrgComplianceDocsForDelivery:', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    document_type: String(row.document_type ?? ''),
    title: String(row.title ?? ''),
    valid_until: (row.valid_until as string | null) ?? null,
    file_storage_path: (row.file_storage_path as string | null) ?? null,
  }))
}

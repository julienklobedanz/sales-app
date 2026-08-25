import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import type { RequirementLinkedDocument } from '@/lib/deals/requirement-link-types'

export function attachRequirementLinkedDocuments(
  links: Array<{ requirement_id: string; document_id: string }>,
  docs: Array<{
    id: string
    title: string | null
    document_type: string | null
    valid_until: string | null
  }>,
): RequirementLinkedDocument[] {
  const byId = new Map(
    docs.map((doc) => [
      doc.id,
      {
        title: String(doc.title ?? ''),
        documentType: String(doc.document_type ?? ''),
        validUntil: doc.valid_until,
      },
    ]),
  )

  const result: RequirementLinkedDocument[] = []
  for (const link of links) {
    const doc = byId.get(link.document_id)
    if (!doc) continue
    result.push({
      requirementId: link.requirement_id,
      documentId: link.document_id,
      title: doc.title,
      documentType: doc.documentType,
      validUntil: doc.validUntil,
    })
  }
  return result
}

export async function loadDealRfpRequirementDocumentLinks(
  supabase: SupabaseClient<Database>,
  args: {
    organizationId: string
    requirementIds: readonly string[]
  },
): Promise<RequirementLinkedDocument[]> {
  if (args.requirementIds.length === 0) return []

  const { data: links, error: linkError } = await supabase
    .from('deal_rfp_requirement_documents')
    .select('requirement_id, document_id')
    .eq('organization_id', args.organizationId)
    .in('requirement_id', [...args.requirementIds])

  if (linkError || !links?.length) return []

  const documentIds = [...new Set(links.map((row) => row.document_id))]
  const { data: docs, error: docError } = await supabase
    .from('organization_compliance_documents')
    .select('id, title, document_type, valid_until')
    .eq('organization_id', args.organizationId)
    .in('id', documentIds)

  if (docError || !docs) return []

  return attachRequirementLinkedDocuments(links, docs)
}

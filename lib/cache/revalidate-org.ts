import { updateTag } from 'next/cache'

import { tagForOrgScope, type OrgCacheScope } from '@/lib/cache/tags'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/** Invalidiert gecachte Org-Reads nach Mutationen (Server Actions: `updateTag`). */
function revalidateOrgCaches(orgId: string, scopes: OrgCacheScope[]): void {
  for (const scope of scopes) {
    updateTag(tagForOrgScope(scope, orgId))
  }
}

export function revalidateOrgReferences(orgId: string): void {
  revalidateOrgCaches(orgId, ['references', 'kpis'])
}

export function revalidateOrgCompliance(orgId: string): void {
  revalidateOrgCaches(orgId, ['compliance'])
}

/** Nach Referenz-Mutation ohne orgId im Scope. */
export async function revalidateOrgCachesForReference(
  referenceId: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('references')
    .select('organization_id')
    .eq('id', referenceId)
    .maybeSingle()
  if (data?.organization_id) {
    revalidateOrgReferences(data.organization_id)
  }
}

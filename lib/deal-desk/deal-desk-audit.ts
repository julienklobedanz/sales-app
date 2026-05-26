import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export async function logDealDeskAudit(
  supabase: SupabaseClient,
  params: {
    orgId: string
    userId: string
    action: string
    entityId: string
    details?: Record<string, unknown>
  }
) {
  await supabase.from('audit_logs').insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity_id: params.entityId,
    action_details: params.details ?? {},
  })
}

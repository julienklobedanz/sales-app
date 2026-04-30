'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { maybeSendSecurityAlertMail } from '@/lib/audit/security-alerts'

type AuditLogInput = {
  orgId: string | null
  userId?: string | null
  action: string
  entityId?: string | null
  actionDetails?: Record<string, unknown>
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userId = input.userId !== undefined ? input.userId : (user?.id ?? null)
    const { error } = await supabase.from('audit_logs').insert({
      org_id: input.orgId,
      user_id: userId,
      action: input.action,
      entity_id: input.entityId ?? null,
      action_details: input.actionDetails ?? {},
    })
    if (error) {
      console.error('[writeAuditLog]', input.action, error.message)
      return
    }
    if (
      input.orgId &&
      (input.action === 'unlock_failed' || input.action === 'unlock_rate_limited')
    ) {
      void maybeSendSecurityAlertMail({
        orgId: input.orgId,
        action: input.action,
      })
    }
  } catch (error) {
    console.error('[writeAuditLog]', input.action, error)
  }
}

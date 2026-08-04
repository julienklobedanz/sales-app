'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { asJson } from '@/lib/supabase/db-types'
import { maybeSendSecurityAlertMail } from '@/lib/audit/security-alerts'
import { log } from '@/lib/observability/logger'

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
      action_details: asJson(input.actionDetails ?? {}),
    })
    if (error) {
      log.error('writeAuditLog.insertFailed', { action: input.action }, error)
      return
    }
      if (input.orgId) {
        const { data: org } = await supabase
          .from('organizations')
          .select('workflow_settings')
          .eq('id', input.orgId)
          .single()
        const settings =
          org?.workflow_settings && typeof org.workflow_settings === 'object'
            ? (org.workflow_settings as Record<string, unknown>)
            : {}
        const retentionRaw = settings.audit_log_retention_days
        const retentionDays =
          typeof retentionRaw === 'number' && Number.isFinite(retentionRaw)
            ? Math.max(30, Math.min(3650, Math.trunc(retentionRaw)))
            : 365
        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
        await supabase
          .from('audit_logs')
          .delete()
          .eq('org_id', input.orgId)
          .lt('timestamp', cutoff)
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
    log.error('writeAuditLog.failed', { action: input.action }, error)
  }
}

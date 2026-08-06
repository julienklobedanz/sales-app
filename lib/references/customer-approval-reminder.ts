import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

import { companyNameFromReferenceRow } from '@/lib/references/library/approvals-helpers'
import { notifyInternalTeamCustomerApprovalPendingReminder } from '@/lib/references/approval-workflow-internal-notifications'
import { log } from '@/lib/observability/logger'

/** Ausstehende Kundenfreigabe: ein Reminder an AM + Anfragenden nach 14 Tagen. */
export const CUSTOMER_APPROVAL_REMINDER_AFTER_DAYS = 14

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function customerApprovalReminderCutoffIso(now = Date.now()): string {
  return new Date(now - CUSTOMER_APPROVAL_REMINDER_AFTER_DAYS * MS_PER_DAY).toISOString()
}

export function isCustomerApprovalReminderDue(args: {
  lastSentAt: string | null
  fallbackSentAt?: string | null
  reminderSentAt: string | null
  now?: number
}): boolean {
  const lastSent = args.lastSentAt?.trim() || args.fallbackSentAt?.trim() || ''
  if (!lastSent) return false

  const lastMs = Date.parse(lastSent)
  if (!Number.isFinite(lastMs)) return false

  const cutoffMs = Date.now() - CUSTOMER_APPROVAL_REMINDER_AFTER_DAYS * MS_PER_DAY
  if (lastMs > cutoffMs) return false

  const reminderMs = args.reminderSentAt ? Date.parse(args.reminderSentAt) : NaN
  if (Number.isFinite(reminderMs) && reminderMs >= lastMs) return false

  return true
}

export async function markCustomerApprovalEmailSent(
  supabase: SupabaseClient<Database>,
  referenceId: string,
  sentAt?: string,
): Promise<void> {
  const at = sentAt ?? new Date().toISOString()
  const { error } = await supabase
    .from('references')
    .update({
      approval_customer_last_sent_at: at,
      approval_customer_reminder_sent_at: null,
    })
    .eq('id', referenceId)
  if (error) {
    log.error(
      'mark sent failed',
      { action: 'markCustomerApprovalEmailSent', message: error.message },
      error,
    )
  }
}

export async function processCustomerApprovalReminders(
  admin: SupabaseClient<Database>,
): Promise<{ scanned: number; sent: number; skipped: number }> {
  const cutoff = customerApprovalReminderCutoffIso()

  const { data: rows, error } = await admin
    .from('references')
    .select(
      `
      id,
      title,
      company_id,
      organization_id,
      approval_requested_by,
      approval_coordinator_email,
      approval_customer_last_sent_at,
      approval_requested_at,
      approval_customer_reminder_sent_at,
      companies ( name )
    `,
    )
    .eq('customer_approval_status', 'pending')
    .not('approval_token', 'is', null)
    .or(
      `approval_customer_last_sent_at.lte.${cutoff},and(approval_customer_last_sent_at.is.null,approval_requested_at.lte.${cutoff})`,
    )

  if (error) {
    log.error(
      'query failed',
      { action: 'processCustomerApprovalReminders.query', message: error.message },
      error,
    )
    return { scanned: 0, sent: 0, skipped: 0 }
  }

  let sent = 0
  let skipped = 0

  for (const row of rows ?? []) {
    if (
      !isCustomerApprovalReminderDue({
        lastSentAt: row.approval_customer_last_sent_at,
        fallbackSentAt: row.approval_requested_at,
        reminderSentAt: row.approval_customer_reminder_sent_at,
      })
    ) {
      skipped += 1
      continue
    }

    const companyName = companyNameFromReferenceRow(row.companies)
    const daysWaiting = CUSTOMER_APPROVAL_REMINDER_AFTER_DAYS

    const emailSent = await notifyInternalTeamCustomerApprovalPendingReminder({
      admin,
      referenceId: row.id,
      referenceTitle: String(row.title ?? 'Referenz').trim() || 'Referenz',
      companyId: row.company_id,
      companyName,
      organizationId: row.organization_id ?? null,
      requesterId: row.approval_requested_by,
      coordinatorEmail: row.approval_coordinator_email,
      daysWaiting,
    })

    if (emailSent) {
      const { error: markError } = await admin
        .from('references')
        .update({ approval_customer_reminder_sent_at: new Date().toISOString() })
        .eq('id', row.id)
      if (markError) {
        log.error(
          'mark sent failed',
          {
            action: 'processCustomerApprovalReminders.markSent',
            message: markError.message,
          },
          markError,
        )
      } else {
        sent += 1
      }
    } else {
      skipped += 1
    }
  }

  return { scanned: rows?.length ?? 0, sent, skipped }
}

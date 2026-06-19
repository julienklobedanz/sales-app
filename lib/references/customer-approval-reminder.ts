import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { notifyInternalTeamCustomerApprovalPendingReminder } from '@/lib/references/approval-workflow-internal-notifications'

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

type PendingReminderRow = {
  id: string
  title: string | null
  company_id: string
  organization_id: string | null
  approval_requested_by: string | null
  approval_coordinator_email: string | null
  approval_customer_last_sent_at: string | null
  approval_requested_at: string | null
  approval_customer_reminder_sent_at: string | null
  companies?: { name?: string } | { name?: string }[] | null
}

export async function markCustomerApprovalEmailSent(
  supabase: SupabaseClient,
  referenceId: string,
  sentAt?: string
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
    console.error('[markCustomerApprovalEmailSent]', error.message)
  }
}

export async function processCustomerApprovalReminders(
  admin: SupabaseClient
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
    `
    )
    .eq('customer_approval_status', 'pending')
    .not('approval_token', 'is', null)
    .or(
      `approval_customer_last_sent_at.lte.${cutoff},and(approval_customer_last_sent_at.is.null,approval_requested_at.lte.${cutoff})`
    )

  if (error) {
    console.error('[processCustomerApprovalReminders] query failed:', error.message)
    return { scanned: 0, sent: 0, skipped: 0 }
  }

  let sent = 0
  let skipped = 0

  for (const row of (rows ?? []) as PendingReminderRow[]) {
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

    const company =
      Array.isArray(row.companies) && row.companies.length > 0
        ? row.companies[0]
        : (row.companies as { name?: string } | null)
    const companyName = company?.name?.trim() || 'Referenz'
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
        console.error('[processCustomerApprovalReminders] mark sent failed:', markError.message)
      } else {
        sent += 1
      }
    } else {
      skipped += 1
    }
  }

  return { scanned: rows?.length ?? 0, sent, skipped }
}

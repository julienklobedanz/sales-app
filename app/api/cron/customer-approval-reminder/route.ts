import { NextResponse } from 'next/server'

import { processCustomerApprovalReminders } from '@/lib/references/customer-approval-reminder'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

export const maxDuration = 120

/**
 * Täglicher Reminder: ausstehende Kundenfreigabe seit 14 Tagen → Mail an AM + Anfragenden.
 * Authorization: Bearer CRON_SECRET · Optional: CUSTOMER_APPROVAL_REMINDER_CRON_DISABLED=1
 */
export async function GET(request: Request) {
  if (process.env.CUSTOMER_APPROVAL_REMINDER_CRON_DISABLED === '1') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const auth = request.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET?.trim()
  const isDev = process.env.NODE_ENV === 'development'

  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else if (!isDev) {
    return NextResponse.json(
      { error: 'CRON_SECRET ist nicht gesetzt (erforderlich außerhalb der Entwicklung).' },
      { status: 503 }
    )
  }

  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Service role nicht verfügbar.' }, { status: 503 })
  }

  // Service-Role weil: org-übergreifender Cron-Scan; Grenze: Bearer CRON_SECRET + Writes pro reference.organization_id.
  const result = await processCustomerApprovalReminders(admin)
  return NextResponse.json({ ok: true, ...result })
}

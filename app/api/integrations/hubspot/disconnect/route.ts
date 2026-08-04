import { NextResponse } from 'next/server'

import { disconnectOrganizationCrm } from '@/lib/crm/connections'
import { requireCrmAdmin } from '@/lib/crm/require-crm-admin'
import { log } from '@/lib/observability/logger'

export async function POST() {
  try {
    const guard = await requireCrmAdmin()
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status })
    }

    const result = await disconnectOrganizationCrm(
      guard.ctx.supabase,
      guard.ctx.organizationId,
      'hubspot'
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Trennen fehlgeschlagen.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('disconnect failed', { action: 'hubspot.disconnect' }, error)
    return NextResponse.json({ error: 'Trennen fehlgeschlagen.' }, { status: 500 })
  }
}

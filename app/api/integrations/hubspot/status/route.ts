import { NextResponse } from 'next/server'

import { getOrganizationCrmConnectionPublicStatus } from '@/lib/crm/connections'
import { isHubSpotConfigured } from '@/lib/crm/hubspot/config'
import { requireCrmAdmin } from '@/lib/crm/require-crm-admin'
import { log } from '@/lib/observability/logger'

export async function GET() {
  try {
    const guard = await requireCrmAdmin()
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status })
    }

    const status = await getOrganizationCrmConnectionPublicStatus(
      guard.ctx.supabase,
      guard.ctx.organizationId,
      'hubspot',
    )

    return NextResponse.json({
      provider: 'hubspot',
      configured: isHubSpotConfigured(),
      ...status,
    })
  } catch (error) {
    log.error('status failed', { action: 'hubspot.status' }, error)
    return NextResponse.json(
      { error: 'Status konnte nicht geladen werden.' },
      { status: 500 },
    )
  }
}

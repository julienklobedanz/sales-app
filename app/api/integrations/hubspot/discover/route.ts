import { NextResponse } from 'next/server'

import { buildCrmImportPreview } from '@/lib/crm/import-crm-accounts'
import { listHubSpotAccountsWithOpenOpportunities } from '@/lib/crm/hubspot/list-accounts-with-opportunities'
import { requireCrmAdmin } from '@/lib/crm/require-crm-admin'
import { log } from '@/lib/observability/logger'

export const maxDuration = 60

export async function GET() {
  try {
    const guard = await requireCrmAdmin()
    if (!guard.success) {
      return NextResponse.json({ error: guard.error }, { status: guard.status })
    }

    const discovered = await listHubSpotAccountsWithOpenOpportunities(
      guard.ctx.supabase,
      guard.ctx.organizationId,
    )

    if (!discovered.success) {
      return NextResponse.json({ error: discovered.error }, { status: 502 })
    }

    const preview = await buildCrmImportPreview(
      guard.ctx.supabase,
      guard.ctx.organizationId,
      'hubspot',
      discovered.accounts,
    )

    return NextResponse.json({
      success: true,
      provider: 'hubspot',
      totalAccounts: preview.length,
      totalOpportunities: preview.reduce((sum, row) => sum + row.opportunities.length, 0),
      items: preview,
    })
  } catch (error) {
    log.error('discover failed', { action: 'hubspot.discover' }, error)
    return NextResponse.json(
      { error: 'CRM-Accounts konnten nicht geladen werden.' },
      { status: 500 },
    )
  }
}

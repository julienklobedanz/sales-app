import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { importCrmAccounts } from '@/lib/crm/import-crm-accounts'
import type { CrmAccountCandidate } from '@/lib/crm/types'
import { ROUTES } from '@/lib/routes'
import { requireCrmAdmin } from '@/lib/crm/require-crm-admin'

export const maxDuration = 60

type ImportBody = {
  accounts?: CrmAccountCandidate[]
}

export async function POST(request: Request) {
  try {
    const guard = await requireCrmAdmin()
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status })
    }

    const body = (await request.json().catch(() => ({}))) as ImportBody
    const accounts = Array.isArray(body.accounts) ? body.accounts : []

    const result = await importCrmAccounts(
      guard.ctx.supabase,
      guard.ctx.organizationId,
      'hubspot',
      accounts
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Import fehlgeschlagen.' }, { status: 400 })
    }

    revalidatePath(ROUTES.accounts)
    revalidatePath(ROUTES.deals.root)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[hubspot/import]', error)
    return NextResponse.json({ error: 'Import fehlgeschlagen.' }, { status: 500 })
  }
}

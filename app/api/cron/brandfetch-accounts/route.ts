import { NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { runBrandfetchStaleAccountsRefresh } from '@/lib/accounts/brandfetch-accounts-refresh'

export const maxDuration = 300

/**
 * Geplanter Brandfetch-Abgleich für Accounts (HQ, Logo, Mitarbeiterzahl, …).
 * Authorization: Bearer CRON_SECRET (wie andere Cron-Routen).
 *
 * Optional: BRANDFETCH_ACCOUNTS_CRON_DISABLED=1,
 * BRANDFETCH_ACCOUNTS_CRON_MAX (default 200), BRANDFETCH_ACCOUNTS_STALE_DAYS (default 90).
 */
export async function GET(request: Request) {
  if (process.env.BRANDFETCH_ACCOUNTS_CRON_DISABLED === '1') {
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

  if (!process.env.BRANDFETCH_API_KEY?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'BRANDFETCH_API_KEY fehlt — geplanter Abgleich nicht möglich.' },
      { status: 503 }
    )
  }

  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY fehlt — Cron nicht möglich.' },
      { status: 503 }
    )
  }

  // Service-Role weil: Brandfetch-Refresh org-übergreifend per Cron.
  // Grenze: Bearer CRON_SECRET; Updates nur pro company.id mit company.organization_id.
  const maxCompanies = Number.parseInt(process.env.BRANDFETCH_ACCOUNTS_CRON_MAX ?? '200', 10)
  const staleAfterDays = Number.parseInt(process.env.BRANDFETCH_ACCOUNTS_STALE_DAYS ?? '90', 10)

  const result = await runBrandfetchStaleAccountsRefresh(admin, {
    maxCompanies: Number.isFinite(maxCompanies) ? maxCompanies : 200,
    staleAfterDays: Number.isFinite(staleAfterDays) ? staleAfterDays : 90,
  })

  if (result.error) {
    return NextResponse.json({ ok: false, ...result }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result })
}

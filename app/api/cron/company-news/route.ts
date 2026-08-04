import { NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { runCompanyNewsIngest } from '@/lib/market-signals/ingest-company-news'
import { runExecutiveIntelIngest } from '@/lib/market-signals/ingest-executive-intel'
import { notifyInstantMarketSignalsAfterIngest } from '@/lib/market-signals/market-signals-instant-alerts'

export const maxDuration = 300

/**
 * Geplanter Abruf (z. B. Vercel Cron): Authorization: Bearer CRON_SECRET
 * Optional: NEWS_INGEST_CRON_DISABLED=1, NEWS_INGEST_MAX_COMPANIES (default 60)
 */
export async function GET(request: Request) {
  if (process.env.NEWS_INGEST_CRON_DISABLED === '1') {
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
      {
        error: 'CRON_SECRET ist nicht gesetzt (erforderlich außerhalb der Entwicklung).',
      },
      { status: 503 },
    )
  }

  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY fehlt – Ingest nicht möglich.' },
      { status: 503 },
    )
  }

  // Service-Role weil: org-übergreifender News/Exec-Ingest per Cron.
  // Grenze: Bearer CRON_SECRET; Ingest-Funktionen schreiben pro company.organization_id.
  const maxCompanies = Number.parseInt(process.env.NEWS_INGEST_MAX_COMPANIES ?? '60', 10)
  const maxExecPeople = Number.parseInt(process.env.EXEC_INTEL_MAX_PEOPLE ?? '40', 10)

  const ingestSince = new Date().toISOString()

  const news = await runCompanyNewsIngest(admin, {
    ingestMode: 'focus_only',
    maxCompanies: Number.isFinite(maxCompanies) ? maxCompanies : 60,
  })

  const executives = await runExecutiveIntelIngest(admin, {
    maxPeople: Number.isFinite(maxExecPeople) ? maxExecPeople : 40,
  })

  let instant: {
    emailed: number
    pushed: number
    skipped: boolean
    errors: string[]
  } | null = null
  if (process.env.MARKET_SIGNALS_INSTANT_ALERTS_DISABLED !== '1') {
    instant = await notifyInstantMarketSignalsAfterIngest(admin, {
      sinceIso: ingestSince,
      organizationId: null,
    })
  }

  const finishedAt = new Date().toISOString()
  const { data: favoriteOrgs } = await admin
    .from('companies')
    .select('organization_id')
    .eq('is_favorite', true)
    .not('organization_id', 'is', null)
    .limit(500)
  const orgIds = Array.from(
    new Set(
      (favoriteOrgs ?? [])
        .map((row) =>
          String((row as { organization_id?: string | null }).organization_id ?? ''),
        )
        .filter(Boolean),
    ),
  )
  if (orgIds.length) {
    await admin.from('audit_logs').insert(
      orgIds.map((orgId) => ({
        org_id: orgId,
        user_id: null,
        action: 'market_signals_ingest_run',
        entity_id: orgId,
        action_details: {
          mode: 'focus_only',
          source: 'cron',
          newsCompaniesScanned: news.companiesScanned,
          newsInserted: news.articlesInserted,
          leadershipMovesInserted: news.leadershipMovesInserted,
          newsErrors: news.errors.length,
          execPeopleScanned: executives.peopleScanned,
          execInserted: executives.signalsInserted,
          execErrors: executives.errors.length,
          at: finishedAt,
        },
      })),
    )
  }

  return NextResponse.json({ ok: true, news, executives, instant })
}

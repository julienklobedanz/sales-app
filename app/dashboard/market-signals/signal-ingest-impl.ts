import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { runMarketSignalEnrichmentBackfill } from '@/lib/market-signals/backfill-signal-enrichment'
import { discoverAndSaveCompanyNewsrooms } from '@/lib/market-signals/discover-company-newsroom'
import { runCompanyNewsIngest } from '@/lib/market-signals/ingest-company-news'
import { runExecutiveIntelIngest } from '@/lib/market-signals/ingest-executive-intel'
import { prepareMarketSignalsFeedRefresh } from '@/lib/market-signals/purge-market-signals'
import { notifyInstantMarketSignalsAfterIngest } from '@/lib/market-signals/market-signals-instant-alerts'
import { writeAuditLog } from '@/lib/audit/log-audit'
import { ROUTES } from '@/lib/routes'
import type {
  BackfillCompanyNewsroomsResult,
  BackfillMarketSignalEnrichmentResult,
  TriggerMarketSignalsIngestResult,
} from './market-signal-action-types'

/** Company Updates + Exec-Presse-Signale (Google News RSS, kein Scraping). */
export async function triggerMarketSignalsIngestForMyOrgImpl(args?: {
  ingestMode?: 'all_accounts' | 'focus_only'
  /** Manueller Refresh: RSS-Zeilen für Favoriten zurücksetzen und neu abrufen. */
  refreshFeeds?: boolean
}): Promise<TriggerMarketSignalsIngestResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .maybeSingle()

  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden.' }
  const ingestMode: 'all_accounts' | 'focus_only' = args?.ingestMode ?? 'focus_only'
  const refreshFeeds = args?.refreshFeeds === true

  // Service-Role weil: RSS-Ingest/Champion-Watchlist schreibt org-weit ohne User-Session pro Zeile.
  // Grenze: organizationId aus authentifiziertem Profil; alle Ingest-Aufrufe mit orgId.
  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return {
      success: false,
      error:
        'SUPABASE_SERVICE_ROLE_KEY fehlt. Lokal: in .env.local den service_role-Key aus Supabase (Project Settings → API) eintragen und Dev-Server neu starten. Production: gleiche Variable in Vercel setzen. Der Key wird für „Signale abrufen“ und Cron-Ingest benötigt (Org-weiter Zugriff inkl. Champion-Watchlist).',
    }
  }

  const ingestSince = new Date().toISOString()

  let purge: { accountNewsDeleted: number; executiveDeleted: number } | undefined
  if (refreshFeeds) {
    try {
      purge = await prepareMarketSignalsFeedRefresh(admin, orgId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return {
        success: false,
        error: `Feed-Refresh konnte nicht vorbereitet werden: ${msg}`,
      }
    }
  }

  const news = await runCompanyNewsIngest(admin, {
    organizationId: orgId,
    ingestMode,
    maxCompanies: 40,
    perCompanyMaxArticles: 5,
  })

  const executives = await runExecutiveIntelIngest(admin, {
    organizationId: orgId,
    maxPeople: 30,
  })

  if (process.env.MARKET_SIGNALS_INSTANT_ALERTS_DISABLED !== '1') {
    await notifyInstantMarketSignalsAfterIngest(admin, {
      sinceIso: ingestSince,
      organizationId: orgId,
    })
  }

  void writeAuditLog({
    orgId,
    action: 'market_signals_ingest_run',
    entityId: orgId,
    actionDetails: {
      mode: ingestMode,
      refreshFeeds,
      purge,
      newsCompaniesScanned: news.companiesScanned,
      newsInserted: news.articlesInserted,
      leadershipMovesInserted: news.leadershipMovesInserted,
      newsErrors: news.errors.length,
      execPeopleScanned: executives.peopleScanned,
      execInserted: executives.signalsInserted,
      execErrors: executives.errors.length,
      at: new Date().toISOString(),
    },
  })

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.marketSignalsManage)
  revalidatePath(ROUTES.home)
  return {
    success: true,
    refreshFeeds,
    purge,
    news: {
      companiesScanned: news.companiesScanned,
      articlesInserted: news.articlesInserted,
      leadershipMovesInserted: news.leadershipMovesInserted,
      errors: news.errors,
    },
    executives: {
      peopleScanned: executives.peopleScanned,
      signalsInserted: executives.signalsInserted,
      skippedNoCompany: executives.skippedNoCompany,
      errors: executives.errors,
    },
  }
}

/** @deprecated Alias – nutze triggerMarketSignalsIngestForMyOrg */
export async function triggerCompanyNewsIngestForMyOrgImpl() {
  return triggerMarketSignalsIngestForMyOrgImpl()
}

/** Bestehende RSS-Zeilen ohne insight_* per LLM/heuristisch anreichern (Org-Scope). */
export async function backfillMarketSignalEnrichmentForMyOrgImpl(args?: {
  maxNews?: number
  maxExecutives?: number
  removeIrrelevant?: boolean
}): Promise<BackfillMarketSignalEnrichmentResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .maybeSingle()

  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden.' }

  // Service-Role weil: LLM-Backfill liest/schreibt Signale org-weit.
  // Grenze: organizationId aus authentifiziertem Profil.
  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return {
      success: false,
      error:
        'SUPABASE_SERVICE_ROLE_KEY fehlt. Lokal in .env.local setzen und Dev-Server neu starten.',
    }
  }

  const result = await runMarketSignalEnrichmentBackfill(admin, {
    organizationId: orgId,
    maxNews: args?.maxNews ?? 60,
    maxExecutives: args?.maxExecutives ?? 60,
    pauseMsBetweenItems: 350,
    removeIrrelevant: args?.removeIrrelevant ?? true,
  })

  void writeAuditLog({
    orgId,
    action: 'market_signals_enrichment_backfill',
    entityId: orgId,
    actionDetails: {
      ...result,
      at: new Date().toISOString(),
    },
  })

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.marketSignalsManage)

  return { success: true, ...result }
}

/**
 * Discover press/newsroom paths for all org accounts with website_url.
 * Default skips companies that already have newsroom_discovered_at; force re-probes.
 */
export async function backfillCompanyNewsroomsForMyOrgImpl(args?: {
  force?: boolean
  batchSize?: number
}): Promise<BackfillCompanyNewsroomsResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden.' }

  const force = Boolean(args?.force)
  const batchSize = Math.min(12, Math.max(2, args?.batchSize ?? 6))

  const { data: rows, error } = await supabase
    .from('companies')
    .select('id, website_url, newsroom_discovered_at')
    .eq('organization_id', orgId)
    .not('website_url', 'is', null)

  if (error) return { success: false, error: error.message }

  type CoRow = {
    id: string
    website_url: string | null
    newsroom_discovered_at: string | null
  }

  const candidates = ((rows ?? []) as CoRow[]).filter((row) => {
    const website = String(row.website_url ?? '').trim()
    if (!website) return false
    if (!force && row.newsroom_discovered_at) return false
    return true
  })

  const skipped = ((rows ?? []) as CoRow[]).length - candidates.length
  let scanned = 0
  let withUrls = 0
  const errors: string[] = []

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map((row) =>
        discoverAndSaveCompanyNewsrooms(supabase, row.id, {
          websiteUrl: row.website_url,
          force,
        }),
      ),
    )
    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      const companyId = batch[j]?.id ?? '?'
      scanned += 1
      if (result.error) {
        errors.push(`${companyId}: ${result.error}`)
        continue
      }
      if (result.urls.length > 0) withUrls += 1
    }
  }

  void writeAuditLog({
    orgId,
    action: 'market_signals_newsroom_backfill',
    entityId: orgId,
    actionDetails: {
      force,
      scanned,
      withUrls,
      skipped,
      errorCount: errors.length,
      at: new Date().toISOString(),
    },
  })

  revalidatePath(ROUTES.marketSignalsManage)

  return { success: true, scanned, withUrls, skipped, errors: errors.slice(0, 20) }
}

export async function updateCompanyNewsroomUrlsImpl(
  companyId: string,
  urls: string[],
): Promise<{ success: true; urls: string[] } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const id = String(companyId ?? '').trim()
  if (!id) return { success: false, error: 'Ungültiger Account.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden.' }

  const cleaned: string[] = []
  const seen = new Set<string>()
  for (const raw of urls) {
    const s = String(raw ?? '').trim()
    if (!s) continue
    let href = s
    if (!/^https?:\/\//i.test(href)) href = `https://${href}`
    try {
      const u = new URL(href)
      if (!u.hostname.includes('.')) continue
      const normalized = u.href.replace(/\/$/, '')
      const key = normalized.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      cleaned.push(normalized)
    } catch {
      continue
    }
  }

  const { error } = await supabase
    .from('companies')
    .update({
      newsroom_urls: cleaned,
      newsroom_discovered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { success: false, error: error.message }

  revalidatePath(ROUTES.marketSignalsManage)
  return { success: true, urls: cleaned }
}

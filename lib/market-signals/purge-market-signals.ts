import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { isLowValueRssTitle } from '@/lib/market-signals/sales-signal-relevance'

type DbClient = SupabaseClient<Database>

export async function getFocusCompanyIdsForOrg(
  supabase: DbClient,
  organizationId: string,
  maxCompanies = 40,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_favorite', true)
    .limit(maxCompanies)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.id).filter(Boolean)
}

export async function getOrgCompanyIds(
  supabase: DbClient,
  organizationId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(8000)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.id).filter(Boolean)
}

export type PurgeLowValueResult = {
  accountNewsDeleted: number
  executiveDeleted: number
}

/** Entfernt Stellenanzeigen und anderes RSS-Rauschen anhand der Titel-Heuristik. */
export async function purgeLowValueMarketSignals(
  supabase: DbClient,
  companyIds: string[],
): Promise<PurgeLowValueResult> {
  if (!companyIds.length) return { accountNewsDeleted: 0, executiveDeleted: 0 }

  let accountNewsDeleted = 0
  let executiveDeleted = 0

  for (let i = 0; i < companyIds.length; i += 50) {
    const chunk = companyIds.slice(i, i + 50)

    const { data: newsRows, error: newsFetchErr } = await supabase
      .from('market_signal_account_news')
      .select('id, body')
      .in('company_id', chunk)
    if (newsFetchErr) throw new Error(newsFetchErr.message)

    const lowValueNewsIds = (newsRows ?? [])
      .filter((r) => isLowValueRssTitle(String(r.body ?? '')))
      .map((r) => r.id)
      .filter(Boolean)

    if (lowValueNewsIds.length) {
      const { error } = await supabase
        .from('market_signal_account_news')
        .delete()
        .in('id', lowValueNewsIds)
      if (error) throw new Error(error.message)
      accountNewsDeleted += lowValueNewsIds.length
    }

    const { data: execRows, error: execFetchErr } = await supabase
      .from('market_signal_executive_events')
      .select('id, change_summary')
      .in('company_id', chunk)
      .eq('event_kind', 'news_mention')
    if (execFetchErr) throw new Error(execFetchErr.message)

    const lowValueExecIds = (execRows ?? [])
      .filter((r) => isLowValueRssTitle(String(r.change_summary ?? '')))
      .map((r) => r.id)
      .filter(Boolean)

    if (lowValueExecIds.length) {
      const { error } = await supabase
        .from('market_signal_executive_events')
        .delete()
        .in('id', lowValueExecIds)
      if (error) throw new Error(error.message)
      executiveDeleted += lowValueExecIds.length
    }
  }

  return { accountNewsDeleted, executiveDeleted }
}

export type PurgeRssIngestResult = {
  accountNewsDeleted: number
  executiveDeleted: number
}

/**
 * Löscht RSS-ingestierte Zeilen für einen Neu-Abruf (Dedupe-Blockade aufheben).
 * Manuelle Einträge (ohne content_hash / ingest_source != RSS) bleiben erhalten.
 */
export async function purgeRssIngestedSignalsForCompanies(
  supabase: DbClient,
  companyIds: string[],
): Promise<PurgeRssIngestResult> {
  if (!companyIds.length) return { accountNewsDeleted: 0, executiveDeleted: 0 }

  let accountNewsDeleted = 0
  let executiveDeleted = 0

  for (let i = 0; i < companyIds.length; i += 50) {
    const chunk = companyIds.slice(i, i + 50)

    const { count: newsCount, error: newsErr } = await supabase
      .from('market_signal_account_news')
      .delete({ count: 'exact' })
      .in('company_id', chunk)
      .in('ingest_source', ['google_news_rss', 'newsroom_rss'])
    if (newsErr) throw new Error(newsErr.message)
    accountNewsDeleted += newsCount ?? 0

    // RSS-Moves (role_change + content_hash) und news_mention gemeinsam zurücksetzen
    const { count: execCount, error: execErr } = await supabase
      .from('market_signal_executive_events')
      .delete({ count: 'exact' })
      .in('company_id', chunk)
      .not('content_hash', 'is', null)
    if (execErr) throw new Error(execErr.message)
    executiveDeleted += execCount ?? 0
  }

  return { accountNewsDeleted, executiveDeleted }
}

export type RefreshMarketSignalsPurgeResult = PurgeLowValueResult & PurgeRssIngestResult

/** Vor manuellem Feed-Refresh: Rauschen entfernen und RSS-Zeilen für Favoriten zurücksetzen. */
export async function prepareMarketSignalsFeedRefresh(
  supabase: DbClient,
  organizationId: string,
): Promise<RefreshMarketSignalsPurgeResult> {
  const [orgCompanyIds, focusCompanyIds] = await Promise.all([
    getOrgCompanyIds(supabase, organizationId),
    getFocusCompanyIdsForOrg(supabase, organizationId),
  ])

  const lowValue = await purgeLowValueMarketSignals(supabase, orgCompanyIds)
  const rss = await purgeRssIngestedSignalsForCompanies(supabase, focusCompanyIds)

  return {
    accountNewsDeleted: lowValue.accountNewsDeleted + rss.accountNewsDeleted,
    executiveDeleted: lowValue.executiveDeleted + rss.executiveDeleted,
  }
}

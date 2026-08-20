'use server'

import type {
  BackfillCompanyNewsroomsResult,
  SignalReferenceMatchPayload,
  TriggerMarketSignalsIngestResult,
  WatchlistCompanyResult,
} from './market-signal-action-types'
import {
  setChampionWatchlistStateImpl,
  setCompaniesWatchlistStateImpl,
  setCompanyWatchlistStateImpl,
  watchCompanyFromSuggestionImpl,
} from './watchlist-impl'
import {
  markMarketSignalNotificationsReadImpl,
  markMarketSignalOutcomeImpl,
  markMarketSignalsIrrelevantImpl,
  snoozeMarketSignalImpl,
} from './signal-inbox-impl'
import {
  backfillCompanyNewsroomsForMyOrgImpl,
  triggerMarketSignalsIngestForMyOrgImpl,
  updateCompanyNewsroomUrlsImpl,
} from './signal-ingest-impl'
import { matchReferencesForSignalsImpl } from './signal-match-impl'

export type {
  WatchlistCompanyResult,
  TriggerMarketSignalsIngestResult,
  BackfillCompanyNewsroomsResult,
  SignalReferenceMatchPayload,
} from './market-signal-action-types'

export async function markMarketSignalNotificationsRead(keys: string[]) {
  return markMarketSignalNotificationsReadImpl(keys)
}

export async function markMarketSignalsIrrelevant(keys: string[]) {
  return markMarketSignalsIrrelevantImpl(keys)
}

export async function setCompanyWatchlistState(companyId: string, isFollowing: boolean) {
  return setCompanyWatchlistStateImpl(companyId, isFollowing)
}

export async function setCompaniesWatchlistState(
  companyIds: string[],
  isFollowing: boolean,
) {
  return setCompaniesWatchlistStateImpl(companyIds, isFollowing)
}

/** Bestehenden Account beobachten oder aus Brandfetch als Target anlegen und beobachten. */
export async function watchCompanyFromSuggestion(input: {
  id: string
  name: string
}): Promise<
  { success: true; company: WatchlistCompanyResult } | { success: false; error: string }
> {
  return watchCompanyFromSuggestionImpl(input)
}

export async function setChampionWatchlistState(
  personName: string,
  isFollowing: boolean,
  companyName?: string | null,
) {
  return setChampionWatchlistStateImpl(personName, isFollowing, companyName)
}

/** Company Updates + Exec-Presse-Signale (Google News RSS, kein Scraping). */
export async function triggerMarketSignalsIngestForMyOrg(args?: {
  ingestMode?: 'all_accounts' | 'focus_only'
  /** Manueller Refresh: RSS-Zeilen für Favoriten zurücksetzen und neu abrufen. */
  refreshFeeds?: boolean
}): Promise<TriggerMarketSignalsIngestResult> {
  return triggerMarketSignalsIngestForMyOrgImpl(args)
}

/**
 * Discover press/newsroom paths for all org accounts with website_url.
 * Default skips companies that already have newsroom_discovered_at; force re-probes.
 */
export async function backfillCompanyNewsroomsForMyOrg(args?: {
  force?: boolean
  batchSize?: number
}): Promise<BackfillCompanyNewsroomsResult> {
  return backfillCompanyNewsroomsForMyOrgImpl(args)
}

export async function updateCompanyNewsroomUrls(
  companyId: string,
  urls: string[],
): Promise<{ success: true; urls: string[] } | { success: false; error: string }> {
  return updateCompanyNewsroomUrlsImpl(companyId, urls)
}

export async function snoozeMarketSignal(args: {
  signalKey: string
  untilIso: string
}): Promise<{ success: true } | { success: false; error: string }> {
  return snoozeMarketSignalImpl(args)
}

export async function markMarketSignalOutcome(args: {
  signalKey: string
  stage: 'outreach' | 'meeting' | 'opportunity'
}): Promise<{ success: true } | { success: false; error: string }> {
  return markMarketSignalOutcomeImpl(args)
}

/**
 * Semantische „Hochzeit“: Signal-Text → Top-Referenzen aus der Org-Bibliothek.
 * Dedupliziert gleiche Queries; begrenzt Parallelität.
 */
export async function matchReferencesForSignals(
  signals: SignalReferenceMatchPayload[],
): Promise<
  | {
      success: true
      byKey: Record<
        string,
        import('@/lib/market-signals/signal-reference-match').SignalMatchHit[]
      >
    }
  | { success: false; error: string }
> {
  return matchReferencesForSignalsImpl(signals)
}

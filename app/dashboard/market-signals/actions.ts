'use server'

import type {
  BackfillCompanyNewsroomsResult,
  BackfillMarketSignalEnrichmentResult,
  DecisionMakerCandidate,
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
  addMarketSignalToDealImpl,
  logMarketSignalQuickActionImpl,
  markMarketSignalNotificationsReadImpl,
  markMarketSignalOutcomeImpl,
  markMarketSignalsIrrelevantImpl,
  setMarketSignalPriorityImpl,
  snoozeMarketSignalImpl,
  submitMarketSignalDraftFeedbackImpl,
} from './signal-inbox-impl'
import {
  backfillCompanyNewsroomsForMyOrgImpl,
  backfillMarketSignalEnrichmentForMyOrgImpl,
  triggerCompanyNewsIngestForMyOrgImpl,
  triggerMarketSignalsIngestForMyOrgImpl,
  updateCompanyNewsroomUrlsImpl,
} from './signal-ingest-impl'
import {
  getDecisionMakerCandidatesImpl,
  matchReferencesForSignalsImpl,
  requestReferenceApprovalForSignalImpl,
} from './signal-match-impl'

export type {
  DecisionMakerCandidate,
  WatchlistCompanyResult,
  TriggerMarketSignalsIngestResult,
  BackfillMarketSignalEnrichmentResult,
  BackfillCompanyNewsroomsResult,
  SignalReferenceMatchPayload,
} from './market-signal-action-types'

export async function markMarketSignalNotificationsRead(keys: string[]) {
  return markMarketSignalNotificationsReadImpl(keys)
}

export async function markMarketSignalsIrrelevant(keys: string[]) {
  return markMarketSignalsIrrelevantImpl(keys)
}

export async function addMarketSignalToDeal(args: {
  dealId: string
  companyId: string
  signalKey: string
  referenceIds?: string[]
}): Promise<{ success: true; added: number } | { success: false; error: string }> {
  return addMarketSignalToDealImpl(args)
}

export async function setCompanyWatchlistState(companyId: string, isFollowing: boolean) {
  return setCompanyWatchlistStateImpl(companyId, isFollowing)
}

export async function setCompaniesWatchlistState(companyIds: string[], isFollowing: boolean) {
  return setCompaniesWatchlistStateImpl(companyIds, isFollowing)
}

/** Bestehenden Account beobachten oder aus Brandfetch als Target anlegen und beobachten. */
export async function watchCompanyFromSuggestion(input: {
  id: string
  name: string
}): Promise<{ success: true; company: WatchlistCompanyResult } | { success: false; error: string }> {
  return watchCompanyFromSuggestionImpl(input)
}

export async function setChampionWatchlistState(
  personName: string,
  isFollowing: boolean,
  companyName?: string | null
) {
  return setChampionWatchlistStateImpl(personName, isFollowing, companyName)
}

export async function getDecisionMakerCandidates(args: {
  companyId: string
  signalKind: 'exec' | 'news'
}): Promise<{ success: true; candidates: DecisionMakerCandidate[] } | { success: false; error: string }> {
  return getDecisionMakerCandidatesImpl(args)
}

/** Company Updates + Exec-Presse-Signale (Google News RSS, kein Scraping). */
export async function triggerMarketSignalsIngestForMyOrg(args?: {
  ingestMode?: 'all_accounts' | 'focus_only'
  /** Manueller Refresh: RSS-Zeilen für Favoriten zurücksetzen und neu abrufen. */
  refreshFeeds?: boolean
}): Promise<TriggerMarketSignalsIngestResult> {
  return triggerMarketSignalsIngestForMyOrgImpl(args)
}

/** @deprecated Alias – nutze triggerMarketSignalsIngestForMyOrg */
export async function triggerCompanyNewsIngestForMyOrg() {
  return triggerCompanyNewsIngestForMyOrgImpl()
}

/** Bestehende RSS-Zeilen ohne insight_* per LLM/heuristisch anreichern (Org-Scope). */
export async function backfillMarketSignalEnrichmentForMyOrg(args?: {
  maxNews?: number
  maxExecutives?: number
  removeIrrelevant?: boolean
}): Promise<BackfillMarketSignalEnrichmentResult> {
  return backfillMarketSignalEnrichmentForMyOrgImpl(args)
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
  urls: string[]
): Promise<{ success: true; urls: string[] } | { success: false; error: string }> {
  return updateCompanyNewsroomUrlsImpl(companyId, urls)
}

export async function requestReferenceApprovalForSignal(args: {
  referenceId: string
  referenceTitle: string
  companyName: string
}): Promise<{ success: true } | { success: false; error: string }> {
  return requestReferenceApprovalForSignalImpl(args)
}

export async function setMarketSignalPriority(args: {
  signalKey: string
  priority: 'today' | 'none'
}): Promise<{ success: true } | { success: false; error: string }> {
  return setMarketSignalPriorityImpl(args)
}

export async function snoozeMarketSignal(args: {
  signalKey: string
  untilIso: string
}): Promise<{ success: true } | { success: false; error: string }> {
  return snoozeMarketSignalImpl(args)
}

export async function submitMarketSignalDraftFeedback(args: {
  signalKey: string
  helpful: boolean
  reason?: string
}): Promise<{ success: true } | { success: false; error: string }> {
  return submitMarketSignalDraftFeedbackImpl(args)
}

export async function markMarketSignalOutcome(args: {
  signalKey: string
  stage: 'outreach' | 'meeting' | 'opportunity'
}): Promise<{ success: true } | { success: false; error: string }> {
  return markMarketSignalOutcomeImpl(args)
}

export async function logMarketSignalQuickAction(args: {
  signalKey: string
  channel: 'hubspot_email' | 'salesforce_task' | 'slack_mention'
}): Promise<{ success: true } | { success: false; error: string }> {
  return logMarketSignalQuickActionImpl(args)
}

/**
 * Semantische „Hochzeit“: Signal-Text → Top-Referenzen aus der Org-Bibliothek.
 * Dedupliziert gleiche Queries; begrenzt Parallelität.
 */
export async function matchReferencesForSignals(
  signals: SignalReferenceMatchPayload[]
): Promise<
  | {
      success: true
      byKey: Record<string, import('@/lib/market-signals/signal-reference-match').SignalMatchHit[]>
    }
  | { success: false; error: string }
> {
  return matchReferencesForSignalsImpl(signals)
}

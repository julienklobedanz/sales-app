'use server'

import { toggleFavoriteImpl } from '@/app/dashboard/references/favorites'
import { submitForApprovalImpl, resendClientApprovalEmailImpl } from '@/app/dashboard/references/approvals'
import type { SubmitForApprovalOptions } from '@/app/dashboard/references/approval-submit-types'
import { getPendingClientApprovalsImpl } from '@/app/dashboard/references/pending-approvals'
import { getInboxNotificationsImpl } from '@/app/dashboard/notifications/inbox'
import {
  markNotificationReadImpl,
  markAllNotificationsReadImpl,
} from '@/app/dashboard/notifications/read-actions'
import type { AppRole } from '@/hooks/useRole'
import { getContactOptionsForReferenceImpl } from '@/app/dashboard/references/approval-contacts'
import { getCompetitorSuggestionsImpl, getIncumbentSuggestionsImpl } from '@/app/dashboard/references/suggestions'
import { getRequestsImpl, reviewRequestImpl } from '@/app/dashboard/references/approval-requests'
import {
  cleanupCompanyDomainNamesImpl,
  mergeDuplicateCompaniesImpl,
} from '@/app/dashboard/companies/maintenance'
import { updateUserRoleImpl } from '@/app/dashboard/settings/user-role'
import { matchReferencesImpl } from '@/app/dashboard/references/match'
import { getDashboardDataImpl, getDeletedReferencesImpl } from '@/app/dashboard/references/dashboard'
import {
  deleteReferenceImpl,
  emptyTrashImpl,
  hardDeleteReferenceImpl,
  restoreReferenceImpl,
} from '@/app/dashboard/references/trash'
import {
  createSharedPortfolioImpl,
  getExistingShareForReferenceImpl,
  getReferencesByIdsImpl,
} from '@/app/dashboard/references/sharing'
import {
  getReferenceAssetsImpl,
  updateReferenceAssetCategoryImpl,
} from '@/app/dashboard/references/assets'
import type { SubmitTicketResult } from '@/app/dashboard/support/tickets'
import { submitTicketImpl } from '@/app/dashboard/support/tickets'
import { updateReferenceImpl } from '@/app/dashboard/references/update'
import { updateReferenceDetailFieldsImpl } from '@/app/dashboard/references/detail-fields'
import { bulkCreateReferencesFromFilesImpl } from '@/app/dashboard/references/bulk-import'
import { generateSummaryFromStoryImpl } from '@/app/dashboard/references/summary'
import { recordKiEntwurfGenerated as recordKiEntwurfGeneratedImpl } from '@/app/dashboard/references/ki-entwurf-log'

export type ReferenceRow = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  status:
    | 'draft'
    | 'internal_only'
    | 'approved'
    | 'anonymized'
  created_at: string
  updated_at: string | null
  company_id: string
  company_name: string
  company_logo_url?: string | null
  website: string | null
  employee_count: number | null
  volume_eur: string | null
  contract_type: string | null
  incumbent_provider: string | null
  competitors: string | null
  customer_challenge: string | null
  our_solution: string | null
  contact_id?: string | null
  contact_email?: string | null
  contact_display?: string | null
  customer_contact_id?: string | null
  customer_contact: string | null
  file_path?: string | null
  is_favorited: boolean
  tags: string | null
  project_status: 'active' | 'completed' | null
  project_start: string | null
  project_end: string | null
  duration_months: number | null
  is_nda_deal?: boolean
  /** Summe der view_count aller Sharing-Links, die diese Referenz enthalten */
  total_share_views?: number
  /** Anzahl der Shared-Portfolios, die diese Referenz enthalten („Link erstellen“-Klicks) */
  share_link_count?: number
  /** Anzahl der Deals, mit denen diese Referenz verknüpft ist */
  deal_link_count?: number
  /** Kunden-Freigabe (Epic 10): pending / approved / rejected */
  customer_approval_status?: string | null
}

export type GetDashboardDataResult = {
  references: ReferenceRow[]
  totalCount: number
  deletedCount: number
}

export type DeletedReferenceRow = {
  id: string
  title: string
  company_name: string
}

export type RequestItem = {
  id: string
  reference_id: string
  reference_title: string
  company_name: string
  requester_name?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export async function getDashboardData(
  onlyFavorites = false
): Promise<GetDashboardDataResult> {
  return getDashboardDataImpl(onlyFavorites) as unknown as GetDashboardDataResult
}

export async function getDeletedReferences(): Promise<DeletedReferenceRow[]> {
  return getDeletedReferencesImpl() as unknown as DeletedReferenceRow[]
}

export async function toggleFavorite(referenceId: string) {
  return toggleFavoriteImpl(referenceId)
}

export type BulkImportReferencesResult =
  | { success: true; created: number }
  | { success: false; error: string }

export type BulkImportGroup = { projectName: string; fileCount: number }

export async function bulkCreateReferencesFromFiles(
  formData: FormData
): Promise<BulkImportReferencesResult> {
  return bulkCreateReferencesFromFilesImpl(formData) as unknown as BulkImportReferencesResult
}

export async function deleteReference(id: string) {
  return deleteReferenceImpl(id)
}

export async function restoreReference(id: string) {
  return restoreReferenceImpl(id)
}

export async function hardDeleteReference(id: string) {
  return hardDeleteReferenceImpl(id)
}

export async function emptyTrash(): Promise<EmptyTrashResult> {
  return emptyTrashImpl()
}

export type EmptyTrashResult = {
  success: boolean
  deleted: number
  error?: string
}

export async function updateReference(id: string, formData: FormData) {
  return updateReferenceImpl(id, formData)
}

/** Teilupdate für Detail-Modal: nur Projektstatus, Incumbent, Wettbewerber */
export async function updateReferenceDetailFields(
  id: string,
  payload: {
    project_status?: 'active' | 'completed' | null
    incumbent_provider?: string | null
    competitors?: string | null
  }
) {
  return updateReferenceDetailFieldsImpl(id, payload)
}

/** Kundenlink erstellen: shared_portfolios Eintrag mit Slug (xxx-xxxx-xxx), gibt URL zurück */
export async function createSharedPortfolio(referenceIds: string[]): Promise<{ success: true; url: string; slug: string } | { success: false; error: string }> {
  return createSharedPortfolioImpl(referenceIds)
}

/** Bestehenden Kundenlink für eine Referenz suchen (für Detail-Modal Popover) */
export async function getExistingShareForReference(referenceId: string): Promise<{ slug: string; url: string } | null> {
  return getExistingShareForReferenceImpl(referenceId)
}

/** Referenzen nach IDs laden (z. B. für Share-Vorschau / ReferenceReader-Liste) */
export async function getReferencesByIds(ids: string[]): Promise<ReferenceRow[]> {
  return getReferencesByIdsImpl(ids)
}

export type ReferenceAssetRow = {
  id: string
  reference_id: string
  file_path: string
  file_name: string | null
  file_type: string | null
  category: 'sales' | 'contract' | 'other'
  created_at: string
}

export async function getReferenceAssets(
  referenceId: string
): Promise<ReferenceAssetRow[]> {
  return getReferenceAssetsImpl(referenceId)
}

export async function updateReferenceAssetCategory(
  assetId: string,
  category: 'sales' | 'contract' | 'other'
): Promise<{ success: boolean; error?: string }> {
  return updateReferenceAssetCategoryImpl(assetId, category)
}

export async function submitTicket(
  type: 'support' | 'feedback',
  subject: string,
  message: string
): Promise<SubmitTicketResult> {
  return submitTicketImpl(type, subject, message)
}

export async function getIncumbentSuggestions(query: string): Promise<string[]> {
  return getIncumbentSuggestionsImpl(query)
}

export async function getCompetitorSuggestions(query: string): Promise<string[]> {
  return getCompetitorSuggestionsImpl(query)
}

export async function submitForApproval(
  id: string,
  options?: SubmitForApprovalOptions
) {
  return submitForApprovalImpl(id, options)
}

export async function getContactOptionsForReference(referenceId: string) {
  return getContactOptionsForReferenceImpl(referenceId)
}

export type { DashboardNotificationItem } from '@/app/dashboard/notifications/inbox'
export type { PendingClientApprovalRow } from '@/app/dashboard/references/pending-approvals'

export async function getInboxNotificationsForLayout(userId: string, role: AppRole) {
  return getInboxNotificationsImpl(userId, role)
}

export async function markNotificationRead(eventId: string) {
  return markNotificationReadImpl(eventId)
}

export async function markAllNotificationReads(eventIds: string[]) {
  return markAllNotificationsReadImpl(eventIds)
}

export async function resendClientApprovalEmail(referenceId: string) {
  return resendClientApprovalEmailImpl(referenceId)
}

export async function getPendingClientApprovals() {
  return getPendingClientApprovalsImpl()
}

export async function getRequests(): Promise<RequestItem[]> {
  return getRequestsImpl()
}

export async function reviewRequest(
  approvalId: string,
  decision: 'approve_external' | 'approve_internal' | 'reject'
) {
  return reviewRequestImpl(approvalId, decision)
}

export async function updateUserRole(role: 'admin' | 'sales') {
  return updateUserRoleImpl(role)
}

/** KI-Zusammenfassung: Aus Herausforderung + Lösung eine prägnante, vertriebsorientierte Zusammenfassung per OpenAI (gpt-4o-mini). */
export type GenerateSummaryResult =
  | { success: true; summary: string }
  | { success: false; error: string }

export async function generateSummaryFromStory(
  customerChallenge: string | null,
  ourSolution: string | null,
  referenceId?: string | null
): Promise<GenerateSummaryResult> {
  return generateSummaryFromStoryImpl(customerChallenge, ourSolution, referenceId)
}

/** Epic 5: Telemetrie nach KI-Entwurf (Sheet). */
export async function recordKiEntwurfGenerated(
  args: Parameters<typeof recordKiEntwurfGeneratedImpl>[0]
): Promise<void> {
  return recordKiEntwurfGeneratedImpl(args)
}

/** Ergebniszeile für semantische Referenz-Suche (Epic 4 / Match Engine). */
export type MatchReferenceHit = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  /** Cosinus-Ähnlichkeit 0–1 (wie RPC `similarity`). */
  similarity: number
  /** Kurztext für Karten (aus Summary gekürzt). */
  snippet: string
  /** Account (Firma) der Referenz. */
  companyName: string | null
  /** Projekt-/Volumenangabe (Rohwert wie in Evidence). */
  volumeEur: string | null
}

export type MatchReferencesResult =
  | { success: true; matches: MatchReferenceHit[] }
  | { success: false; error: string }

export type MatchReferencesOptions = {
  matchThreshold?: number
  matchCount?: number
  /**
   * Nach Vektor-Top-N: GPT-4o-mini sortiert Kandidaten neu nach inhaltlicher Passung (~1–2s extra).
   * Bei API-Fehler bleibt die Vektor-Reihenfolge erhalten.
   */
  rerank?: boolean
}

/**
 * Semantische Referenz-Suche: Freitext → Embedding → `match_references` (nur eigene Organisation).
 * Optional `dealId`: Deal-Kontext (Titel, Branche, Volumen) wird dem Suchtext vorangestellt.
 */
export async function matchReferences(
  input: string,
  dealId?: string,
  options?: MatchReferencesOptions
): Promise<MatchReferencesResult> {
  return matchReferencesImpl(input, dealId, options)
}

export type MergeDuplicateCompaniesResult =
  | { success: true; merged: number; deleted: number }
  | { success: false; error: string }

export type CleanupCompanyDomainNamesResult =
  | { success: true; updated: number }
  | { success: false; error: string }

export async function mergeDuplicateCompanies(): Promise<MergeDuplicateCompaniesResult> {
  return mergeDuplicateCompaniesImpl()
}

export async function cleanupCompanyDomainNames(): Promise<CleanupCompanyDomainNamesResult> {
  return cleanupCompanyDomainNamesImpl()
}

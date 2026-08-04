'use server'

import { toggleFavoriteImpl } from '@/lib/references/library/favorites'
import {
  submitForApprovalImpl,
  resendClientApprovalEmailImpl,
  requestCustomerApprovalAgainAfterChangesImpl,
  updateApprovalRecipientImpl,
  updateApprovalCoordinatorImpl,
  approveInternalAndSendImpl,
  getApprovalLinkImpl,
  withdrawApprovalRequestImpl,
  type ApproveInternalRecipientOptions,
} from '@/lib/references/library/approvals'
import type { SubmitForApprovalOptions } from '@/lib/references/library/approval-submit-types'
import { getPendingClientApprovalsImpl } from '@/lib/references/library/pending-approvals'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { getInboxNotificationsImpl } from '@/app/dashboard/notifications/inbox'
import {
  markNotificationReadImpl,
  markAllNotificationsReadImpl,
} from '@/app/dashboard/notifications/read-actions'
import { getContactOptionsForReferenceImpl } from '@/lib/references/library/approval-contacts'
import {
  getCompetitorSuggestionsImpl,
  getIncumbentSuggestionsImpl,
} from '@/lib/references/library/suggestions'
import {
  getRequestsImpl,
  reviewRequestImpl,
} from '@/lib/references/library/approval-requests'
import {
  cleanupCompanyDomainNamesImpl,
  mergeDuplicateCompaniesImpl,
} from '@/app/dashboard/accounts/maintenance'
import { updateUserRoleImpl } from '@/app/dashboard/settings/user-role'
import { matchReferencesImpl } from '@/lib/references/library/match'
import type {
  MatchReferencesOptions,
  MatchReferencesResult,
} from '@/lib/match/match-types'
import {
  getDashboardDataImpl,
  getDeletedReferencesImpl,
} from '@/lib/references/library/dashboard'
import {
  deleteReferenceImpl,
  emptyTrashImpl,
  hardDeleteReferenceImpl,
  restoreReferenceImpl,
} from '@/lib/references/library/trash'
import {
  createSharedPortfolioImpl,
  getExistingShareForReferenceImpl,
  getPortfolioViewSessionsForReferenceImpl,
  getReferencesByIdsImpl,
  resetSharedPortfolioManageTokenImpl,
  updateShareLinkSecurityByReferenceImpl,
} from '@/lib/references/library/sharing'
import {
  getReferenceAssetsImpl,
  updateReferenceAssetCategoryImpl,
} from '@/lib/references/library/assets'
import type { SubmitTicketResult } from '@/app/dashboard/support/tickets'
import { submitTicketImpl } from '@/app/dashboard/support/tickets'
import { updateReferenceImpl } from '@/lib/references/library/update'
import { updateReferenceDetailFieldsImpl } from '@/lib/references/library/detail-fields'
import { bulkCreateReferencesFromFilesImpl } from '@/lib/references/library/bulk-import'
import { generateSummaryFromStoryImpl } from '@/lib/references/library/summary'
import { recordKiEntwurfGenerated as recordKiEntwurfGeneratedImpl } from '@/lib/references/library/ki-entwurf-log'

export type ReferenceRow = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  status: 'draft' | 'internal_only' | 'approved' | 'anonymized'
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
  approval_scope_named_mention?: boolean | null
  approval_scope_anonymous_mention?: boolean | null
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
  onlyFavorites = false,
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
  | { success: true; created: number; referenceIds: string[]; organizationId: string }
  | { success: false; error: string }

export type BulkImportGroup = { projectName: string; fileCount: number }

export async function bulkCreateReferencesFromFiles(
  formData: FormData,
): Promise<BulkImportReferencesResult> {
  return bulkCreateReferencesFromFilesImpl(
    formData,
  ) as unknown as BulkImportReferencesResult
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
  },
) {
  return updateReferenceDetailFieldsImpl(id, payload)
}

/** Kundenlink erstellen: shared_portfolios Eintrag mit Slug (xxx-xxxx-xxx), gibt URL zurück */
export async function createSharedPortfolio(
  referenceIds: string[],
  recipient?: {
    label: string
    visitorEmail?: string | null
    externalContactId?: string | null
    companyId?: string | null
  } | null,
): Promise<
  | {
      success: true
      url: string
      slug: string
      initialPassword?: string | null
      manageToken?: string
    }
  | { success: false; error: string }
> {
  return createSharedPortfolioImpl(referenceIds, recipient)
}

/** Bestehenden Kundenlink für eine Referenz suchen (für Detail-Modal Popover) */
export async function getExistingShareForReference(referenceId: string): Promise<{
  slug: string
  url: string
  expiresAt: string | null
  hasPassword: boolean
  hasCustomerManageToken: boolean
  gateMode: 'none' | 'password' | 'email'
} | null> {
  return getExistingShareForReferenceImpl(referenceId)
}

export async function getPortfolioViewSessions(referenceId: string) {
  return getPortfolioViewSessionsForReferenceImpl(referenceId)
}

/** Neues ?manage=-Geheimnis für bestehenden Kundenlink (macht alten Sperr-Link ungültig). */
export async function resetSharedPortfolioManageToken(
  referenceId: string,
  options?: { notifyCustomer?: boolean },
): Promise<
  | { success: true; manageToken: string; customerEmailSent?: boolean }
  | { success: false; error: string }
> {
  return resetSharedPortfolioManageTokenImpl(referenceId, options)
}

export async function getCustomerApprovalRecipientEmail(
  referenceId: string,
): Promise<string | null> {
  const { getCustomerApprovalRecipientEmailImpl } =
    await import('@/lib/references/client-approval-confirmation-email')
  return getCustomerApprovalRecipientEmailImpl(referenceId)
}

export async function updateShareLinkSecurity(
  referenceId: string,
  input: {
    passwordPlain: string | null
    removePassword: boolean
    expiresAtIso: string | null
    clearExpires: boolean
    gateMode?: 'none' | 'password' | 'email' | null
  },
): Promise<{ success: true } | { success: false; error: string }> {
  return updateShareLinkSecurityByReferenceImpl(referenceId, input)
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
  referenceId: string,
): Promise<ReferenceAssetRow[]> {
  return getReferenceAssetsImpl(referenceId)
}

export async function updateReferenceAssetCategory(
  assetId: string,
  category: 'sales' | 'contract' | 'other',
): Promise<{ success: boolean; error?: string }> {
  return updateReferenceAssetCategoryImpl(assetId, category)
}

export async function submitTicket(
  type: 'support' | 'feedback',
  subject: string,
  message: string,
  options?: { replyToEmail?: string },
): Promise<SubmitTicketResult> {
  return submitTicketImpl(type, subject, message, options)
}

export async function getIncumbentSuggestions(query: string): Promise<string[]> {
  return getIncumbentSuggestionsImpl(query)
}

export async function getCompetitorSuggestions(query: string): Promise<string[]> {
  return getCompetitorSuggestionsImpl(query)
}

export async function submitForApproval(id: string, options?: SubmitForApprovalOptions) {
  return submitForApprovalImpl(id, options)
}

export async function approveInternalAndSend(
  referenceId: string,
  recipient?: ApproveInternalRecipientOptions,
) {
  return approveInternalAndSendImpl(referenceId, recipient)
}

export type {
  ApproveInternalAndSendResult,
  ApproveInternalRecipientOptions,
} from '@/lib/references/library/approvals'

export async function getApprovalLink(referenceId: string) {
  return getApprovalLinkImpl(referenceId)
}

export async function withdrawApprovalRequest(referenceId: string) {
  return withdrawApprovalRequestImpl(referenceId)
}

export async function getContactOptionsForReference(referenceId: string) {
  return getContactOptionsForReferenceImpl(referenceId)
}

export type { DashboardNotificationItem } from '@/app/dashboard/notifications/inbox'
export type { PendingClientApprovalRow } from '@/lib/references/library/pending-approvals'

export async function getInboxNotificationsForLayout(
  userId: string,
  systemRole: SystemRole,
  functionRole: FunctionRole,
) {
  return getInboxNotificationsImpl(userId, systemRole, functionRole)
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

export async function requestCustomerApprovalAgainAfterChanges(referenceId: string) {
  return requestCustomerApprovalAgainAfterChangesImpl(referenceId)
}

export async function updateApprovalRecipient(
  referenceId: string,
  recipient: ApproveInternalRecipientOptions,
) {
  return updateApprovalRecipientImpl(referenceId, recipient)
}

export async function updateApprovalCoordinator(
  referenceId: string,
  coordinatorEmail: string,
) {
  return updateApprovalCoordinatorImpl(referenceId, coordinatorEmail)
}

export async function getPendingClientApprovals() {
  return getPendingClientApprovalsImpl()
}

export async function getRequests(): Promise<RequestItem[]> {
  return getRequestsImpl()
}

export async function reviewRequest(
  approvalId: string,
  decision: 'approve_external' | 'approve_internal' | 'reject',
) {
  return reviewRequestImpl(approvalId, decision)
}

/** @deprecated Transitorisch — nutzt system_role/function_role; siehe updateUserRoleImpl. */
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
  referenceId?: string | null,
): Promise<GenerateSummaryResult> {
  return generateSummaryFromStoryImpl(customerChallenge, ourSolution, referenceId)
}

/** Epic 5: Telemetrie nach KI-Entwurf (Sheet). */
export async function recordKiEntwurfGenerated(
  args: Parameters<typeof recordKiEntwurfGeneratedImpl>[0],
): Promise<void> {
  return recordKiEntwurfGeneratedImpl(args)
}

export type {
  MatchReferenceHit,
  MatchReferenceFilters,
  MatchReferencesOptions,
  MatchReferencesResult,
} from '@/lib/match/match-types'

/**
 * Semantische Referenz-Suche: Freitext → Embedding → `match_references` (nur eigene Organisation).
 * Optional `dealId`: Deal-Kontext (Titel, Branche, Volumen) wird dem Suchtext vorangestellt.
 */
export async function matchReferences(
  input: string,
  dealId?: string,
  options?: MatchReferencesOptions,
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

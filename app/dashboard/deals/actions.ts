'use server'

import type { DealRow, DealStatus, DealWithReferences } from './types'
import { getDealsImpl, getDealWithReferencesImpl } from './deal-query-impl'
import { getReferencesForOrgImpl } from './org-reference-catalog-impl'
import {
  createDealImpl,
  updateDealImpl,
  setDealRfpModeImpl,
  deleteDealImpl,
  recordDealOutcomeImpl,
} from './deal-crud-impl'
import {
  addReferenceToDealImpl,
  addReferenceToDealWithScoreImpl,
  suggestReferencesForDealActionImpl,
  removeReferenceFromDealImpl,
  recordReferenceHelpedImpl,
} from './deal-references-impl'
import {
  importDealsFromXlsxImpl,
  createDealReferenceRequestImpl,
} from './deal-import-request-impl'

export async function getDeals(): Promise<DealRow[]> {
  return getDealsImpl()
}

export async function getDealWithReferences(
  id: string,
): Promise<DealWithReferences | null> {
  return getDealWithReferencesImpl(id)
}

export async function createDeal(
  formData: FormData,
): Promise<{ success: boolean; error?: string; id?: string }> {
  return createDealImpl(formData)
}

/** Referenzen der eigenen Org (id, title, company_name) für Verknüpfung mit Deal */
export async function getReferencesForOrg(): Promise<
  { id: string; title: string; company_name: string }[]
> {
  return getReferencesForOrgImpl()
}

export async function addReferenceToDeal(
  dealId: string,
  referenceId: string,
): Promise<{ error?: string }> {
  return addReferenceToDealImpl(dealId, referenceId)
}

export async function addReferenceToDealWithScore(args: {
  dealId: string
  referenceId: string
  similarityScore?: number | null
}): Promise<{ success: boolean; error?: string }> {
  return addReferenceToDealWithScoreImpl(args)
}

export async function suggestReferencesForDealAction(dealId: string) {
  return suggestReferencesForDealActionImpl(dealId)
}

export async function updateDeal(args: {
  id: string
  title: string
  company_id: string | null
  industry: string | null
  volume: string | null
  status: DealStatus
  expiry_date: string | null
  is_public: boolean
  account_manager_id: string | null
  sales_manager_id: string | null
  requirements_text: string | null
  incumbent_provider: string | null
}): Promise<{ success: boolean; error?: string }> {
  return updateDealImpl(args)
}

/** Manuell RFP-Modus setzen (Promote/Demote). Nur explizite Nutzeraktion — nicht für stateless Coverage. */
export async function setDealRfpMode(
  dealId: string,
  isRfpMode: boolean,
): Promise<{ success: boolean; error?: string }> {
  return setDealRfpModeImpl(dealId, isRfpMode)
}

/** Deal inkl. Storage (deal-documents + legacy rfp-documents) und Desk-Projekte löschen. */
export async function deleteDeal(
  dealId: string,
): Promise<{ success: boolean; error?: string }> {
  return deleteDealImpl(dealId)
}

export async function recordDealOutcome(args: {
  dealId: string
  outcome: 'won' | 'lost' | 'withdrawn'
  comment?: string
  /** `true`/`false`/`null` = gesetzt; weglassen = keine Angabe im Payload. */
  referenceHelpful?: boolean | null
}): Promise<{ success: boolean; error?: string }> {
  return recordDealOutcomeImpl(args)
}

export async function removeReferenceFromDeal(
  dealId: string,
  referenceId: string,
): Promise<{ error?: string }> {
  return removeReferenceFromDealImpl(dealId, referenceId)
}

export async function recordReferenceHelped(args: {
  dealId: string
  referenceId: string
  helped: boolean
  comment?: string
}): Promise<{ success: boolean; error?: string }> {
  return recordReferenceHelpedImpl(args)
}

/** Marktlisten (xlsx) importieren: Zeilen als Expiring Deals anlegen. */
export async function importDealsFromXlsx(
  formData: FormData,
): Promise<{ success: boolean; created?: number; error?: string }> {
  return importDealsFromXlsxImpl(formData)
}

export async function createDealReferenceRequest(args: {
  dealId: string
  message: string
}): Promise<{ success: boolean; error?: string; id?: string }> {
  return createDealReferenceRequestImpl(args)
}

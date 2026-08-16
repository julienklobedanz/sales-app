'use server'

import type { PartnerCategory } from '@/lib/accounts/account-entity'
import type {
  AccountDealRow,
  AccountStatusValue,
  CompanyRefRow,
  DealSignalRow,
  RecommendedReference,
} from './account-action-types'
import { getReferencesForOrgImpl, getReferencesByCompanyIdImpl } from './account-match-impl'
import {
  getActiveDealsByCompanyIdImpl,
  getExpiringDealsByCompanyIdImpl,
} from './account-deals-impl'
import {
  updateCompanyAccountStatusImpl,
  toggleCompanyFavoriteImpl,
  createCompanyImpl,
  createPartnerImpl,
  bulkCreateCompaniesFromSheetImpl,
  updateCompanyImpl,
  deleteCompanyWithDataImpl,
} from './account-crud-impl'

export type {
  AccountStatusValue,
  CompanyStrategyRow,
  StakeholderRole,
  StakeholderRow,
  CompanyRefRow,
  RoadmapProjectRow,
  RecommendedReference,
  ContactPersonRow,
  ExternalContactRow,
  AccountDealRow,
  DealSignalRow,
} from './account-action-types'

export async function getReferencesForOrg(limit = 10): Promise<RecommendedReference[]> {
  return getReferencesForOrgImpl(limit)
}

export async function getReferencesByCompanyId(
  companyId: string,
): Promise<CompanyRefRow[]> {
  return getReferencesByCompanyIdImpl(companyId)
}

export async function getActiveDealsByCompanyId(
  companyId: string,
): Promise<AccountDealRow[]> {
  return getActiveDealsByCompanyIdImpl(companyId)
}

export async function getExpiringDealsByCompanyId(
  companyId: string,
): Promise<DealSignalRow[]> {
  return getExpiringDealsByCompanyIdImpl(companyId)
}

export async function updateCompanyAccountStatus(
  companyId: string,
  account_status: AccountStatusValue | null,
): Promise<{ success: boolean; error?: string }> {
  return updateCompanyAccountStatusImpl(companyId, account_status)
}

export async function toggleCompanyFavorite(
  companyId: string,
  isFavorite: boolean,
): Promise<{ success: boolean; error?: string }> {
  return toggleCompanyFavoriteImpl(companyId, isFavorite)
}

export async function createCompany(payload: {
  name: string
  website_url?: string | null
  industry?: string | null
  headquarters?: string | null
  logo_url?: string | null
  employee_count?: number | null
  description?: string | null
  account_status?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  return createCompanyImpl(payload)
}

export async function createPartner(payload: {
  name: string
  website_url?: string | null
  industry?: string | null
  headquarters?: string | null
  logo_url?: string | null
  description?: string | null
  partner_category: PartnerCategory
  alsoCreateAccount?: boolean
}): Promise<
  { success: true; id: string; accountId?: string } | { success: false; error: string }
> {
  return createPartnerImpl(payload)
}

export async function bulkCreateCompaniesFromSheet(
  fileBuffer: Uint8Array,
  options: { entityKind?: 'account' | 'partner' } = {},
): Promise<{
  success: boolean
  createdCount: number
  skippedCount: number
  failedCount: number
  error?: string
}> {
  return bulkCreateCompaniesFromSheetImpl(fileBuffer, options)
}

export async function updateCompany(payload: {
  id: string
  name: string
  website_url?: string | null
  industry?: string | null
  headquarters?: string | null
  logo_url?: string | null
  employee_count?: number | null
  description?: string | null
  account_status?: string | null
}): Promise<{ success: boolean; error?: string }> {
  return updateCompanyImpl(payload)
}

export async function deleteCompanyWithData(
  companyId: string,
): Promise<{ success: boolean; error?: string }> {
  return deleteCompanyWithDataImpl(companyId)
}

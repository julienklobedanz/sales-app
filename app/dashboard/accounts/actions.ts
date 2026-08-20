'use server'

import type { PartnerCategory } from '@/lib/accounts/account-entity'
import type {
  AccountDealRow,
  AccountStatusValue,
  CompanyRefRow,
} from './account-action-types'
import { getReferencesByCompanyIdImpl } from './account-match-impl'
import { getActiveDealsByCompanyIdImpl } from './account-deals-impl'
import {
  updateCompanyAccountStatusImpl,
  toggleCompanyFavoriteImpl,
  createCompanyImpl,
  createPartnerImpl,
  bulkCreateCompaniesFromSheetImpl,
  deleteCompanyWithDataImpl,
} from './account-crud-impl'

export type {
  AccountStatusValue,
  CompanyRefRow,
  AccountDealRow,
} from './account-action-types'

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

export async function deleteCompanyWithData(
  companyId: string,
): Promise<{ success: boolean; error?: string }> {
  return deleteCompanyWithDataImpl(companyId)
}

'use server'

import type {
  AccountDealRow,
  CompanyRefRow,
} from './account-action-types'
import { getReferencesByCompanyIdImpl } from './account-match-impl'
import { getActiveDealsByCompanyIdImpl } from './account-deals-impl'
import {
  createCompanyImpl,
  bulkCreateCompaniesFromSheetImpl,
} from './account-crud-impl'

export type {
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

export async function bulkCreateCompaniesFromSheet(
  fileBuffer: Uint8Array,
): Promise<{
  success: boolean
  createdCount: number
  skippedCount: number
  failedCount: number
  error?: string
}> {
  return bulkCreateCompaniesFromSheetImpl(fileBuffer)
}

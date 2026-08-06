'use server'

import type { PartnerCategory } from '@/lib/accounts/account-entity'
import type {
  AccountDealRow,
  AccountStatusValue,
  CompanyRefRow,
  CompanyStrategyRow,
  ContactPersonRow,
  DealSignalRow,
  RecommendedReference,
  RoadmapProjectRow,
  StakeholderRole,
  StakeholderRow,
} from './account-action-types'
import {
  getCompanyStrategyImpl,
  upsertCompanyStrategyImpl,
  getRoadmapProjectsImpl,
  upsertRoadmapProjectImpl,
  deleteRoadmapProjectImpl,
} from './strategy-roadmap-impl'
import {
  getStakeholdersImpl,
  createStakeholderImpl,
  updateStakeholderImpl,
  deleteStakeholderImpl,
} from './stakeholders-impl'
import {
  updateExternalContactBuyingCenterRoleImpl,
  getContactsByCompanyIdImpl,
  setCompanyInternalReferenceApprovalContactImpl,
  createContactPersonImpl,
  updateContactPersonImpl,
  deleteContactPersonImpl,
} from './contacts-impl'
import {
  getRecommendedReferencesImpl,
  getReferencesForOrgImpl,
  getReferencesByCompanyIdImpl,
  getRecommendedReferencesForAccountImpl,
} from './account-match-impl'
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
import { generateOnePagerHtmlImpl } from './onepager-impl'

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

export async function getCompanyStrategy(
  companyId: string,
): Promise<CompanyStrategyRow | null> {
  return getCompanyStrategyImpl(companyId)
}

export async function upsertCompanyStrategy(
  companyId: string,
  payload: {
    company_goals?: string | null
    red_flags?: string | null
    competition?: string | null
    next_steps?: string | null
    value_proposition?: string | null
    metrics_pain?: string | null
    mh_assessment?: Record<string, unknown> | null
  },
): Promise<{ success: boolean; error?: string }> {
  return upsertCompanyStrategyImpl(companyId, payload)
}

export async function getRoadmapProjects(
  companyId: string,
): Promise<RoadmapProjectRow[]> {
  return getRoadmapProjectsImpl(companyId)
}

export async function upsertRoadmapProject(
  companyId: string,
  payload: {
    id?: string
    project_name: string
    estimated_value?: string | null
    status?: string | null
    target_date?: string | null
    tags?: string | null
  },
): Promise<{ success: boolean; error?: string }> {
  return upsertRoadmapProjectImpl(companyId, payload)
}

export async function deleteRoadmapProject(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  return deleteRoadmapProjectImpl(id)
}

export async function getRecommendedReferences(
  projectId: string,
): Promise<RecommendedReference[]> {
  return getRecommendedReferencesImpl(projectId)
}

export async function getReferencesForOrg(limit = 10): Promise<RecommendedReference[]> {
  return getReferencesForOrgImpl(limit)
}

export async function getStakeholders(companyId: string): Promise<StakeholderRow[]> {
  return getStakeholdersImpl(companyId)
}

export async function createStakeholder(
  companyId: string,
  payload: {
    name: string
    title?: string | null
    role: StakeholderRole
    influence_level?: string | null
    attitude?: string | null
    notes?: string | null
    linkedin_url?: string | null
    priorities_topics?: string | null
    last_contact_at?: string | null
    last_interaction_at?: string | null
    sentiment?: string | null
  },
): Promise<{ success: boolean; stakeholder?: StakeholderRow; error?: string }> {
  return createStakeholderImpl(companyId, payload)
}

export async function updateStakeholder(
  id: string,
  payload: {
    name?: string
    title?: string | null
    role?: StakeholderRole
    influence_level?: string | null
    attitude?: string | null
    notes?: string | null
    linkedin_url?: string | null
    priorities_topics?: string | null
    last_contact_at?: string | null
    last_interaction_at?: string | null
    sentiment?: string | null
  },
): Promise<{ success: boolean; error?: string }> {
  return updateStakeholderImpl(id, payload)
}

export async function deleteStakeholder(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  return deleteStakeholderImpl(id)
}

export async function getReferencesByCompanyId(
  companyId: string,
): Promise<CompanyRefRow[]> {
  return getReferencesByCompanyIdImpl(companyId)
}

export async function updateExternalContactBuyingCenterRole(
  id: string,
  role: StakeholderRole,
): Promise<{ success: boolean; error?: string }> {
  return updateExternalContactBuyingCenterRoleImpl(id, role)
}

export async function getContactsByCompanyId(
  companyId: string,
): Promise<ContactPersonRow[]> {
  return getContactsByCompanyIdImpl(companyId)
}

export async function setCompanyInternalReferenceApprovalContact(
  companyId: string,
  contactPersonId: string | null,
): Promise<{ success: boolean; error?: string }> {
  return setCompanyInternalReferenceApprovalContactImpl(companyId, contactPersonId)
}

export async function createContactPerson(
  companyId: string,
  payload: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    linkedin_url?: string | null
    role?: string | null
    position?: string | null
    last_interaction_at?: string | null
  },
): Promise<{ success: boolean; contact?: ContactPersonRow; error?: string }> {
  return createContactPersonImpl(companyId, payload)
}

export async function updateContactPerson(
  id: string,
  payload: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    linkedin_url?: string | null
    role?: string | null
    position?: string | null
    company_id?: string | null
    last_interaction_at?: string | null
  },
): Promise<{ success: boolean; error?: string }> {
  return updateContactPersonImpl(id, payload)
}

export async function deleteContactPerson(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  return deleteContactPersonImpl(id)
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

export async function getRecommendedReferencesForAccount(
  companyId: string,
): Promise<RecommendedReference[]> {
  return getRecommendedReferencesForAccountImpl(companyId)
}

export async function generateOnePagerHtml(
  companyId: string,
): Promise<{ success: boolean; html?: string; error?: string }> {
  return generateOnePagerHtmlImpl(companyId)
}

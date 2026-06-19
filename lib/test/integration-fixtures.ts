import { randomUUID } from 'node:crypto'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import { createIntegrationAnonClient } from '@/lib/test/integration-supabase'

type SystemRole = Database['public']['Enums']['system_role']
type FunctionRole = Database['public']['Enums']['function_role']

export type IntegrationTestUser = {
  id: string
  email: string
  password: string
}

export type IntegrationReferenceFixtures = {
  draftByAdminId: string
  approvedId: string
  ndaId: string
  orgBReferenceId: string
}

export type IntegrationOrgFixtures = {
  runId: string
  orgAId: string
  orgBId: string
  companyAId: string
  companyBId: string
  salesRep: IntegrationTestUser
  admin: IntegrationTestUser
  accountManager: IntegrationTestUser
  references: IntegrationReferenceFixtures
}

function testEmail(label: string, runId: string): string {
  return `e3-${label}-${runId}@refstack-integration.test`
}

async function createAuthUser(
  admin: SupabaseClient<Database>,
  params: {
    email: string
    password: string
    organizationId: string
    systemRole: SystemRole
    functionRole: FunctionRole
  }
): Promise<IntegrationTestUser> {
  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
  })
  if (error || !data.user?.id) {
    throw new Error(`Test-User konnte nicht angelegt werden: ${error?.message ?? 'unknown'}`)
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id,
    full_name: params.email.split('@')[0],
    organization_id: params.organizationId,
    system_role: params.systemRole,
    function_role: params.functionRole,
    capabilities: {},
  })
  if (profileError) {
    throw new Error(`Test-Profil konnte nicht angelegt werden: ${profileError.message}`)
  }

  return { id: data.user.id, email: params.email, password: params.password }
}

async function insertReference(
  admin: SupabaseClient<Database>,
  params: {
    organizationId: string
    companyId: string
    title: string
    status: Database['public']['Enums']['reference_status']
    createdBy?: string | null
    isNdaDeal?: boolean
    approvalScopeConfidentialSales?: boolean
    customerApprovalStatus?: string | null
    approvalInternalStatus?: string
    approvalToken?: string | null
    approvalInternalReviewToken?: string | null
  }
): Promise<string> {
  const { data, error } = await admin
    .from('references')
    .insert({
      organization_id: params.organizationId,
      company_id: params.companyId,
      title: params.title,
      status: params.status,
      created_by: params.createdBy ?? null,
      is_nda_deal: params.isNdaDeal ?? false,
      approval_scope_confidential_sales: params.approvalScopeConfidentialSales ?? false,
      customer_approval_status: params.customerApprovalStatus ?? null,
      approval_internal_status: params.approvalInternalStatus ?? 'pending_internal',
      approval_token: params.approvalToken ?? null,
      approval_internal_review_token: params.approvalInternalReviewToken ?? null,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error(`Test-Referenz konnte nicht angelegt werden: ${error?.message ?? 'unknown'}`)
  }
  return data.id
}

export async function seedIntegrationOrgFixtures(
  admin: SupabaseClient<Database>
): Promise<IntegrationOrgFixtures> {
  const runId = randomUUID().slice(0, 8)
  const password = `Test-${runId}!Aa1`

  const { data: orgA, error: orgAError } = await admin
    .from('organizations')
    .insert({ name: `Integration Org A ${runId}` })
    .select('id')
    .single()
  if (orgAError || !orgA?.id) {
    throw new Error(`Org A konnte nicht angelegt werden: ${orgAError?.message ?? 'unknown'}`)
  }

  const { data: orgB, error: orgBError } = await admin
    .from('organizations')
    .insert({ name: `Integration Org B ${runId}` })
    .select('id')
    .single()
  if (orgBError || !orgB?.id) {
    throw new Error(`Org B konnte nicht angelegt werden: ${orgBError?.message ?? 'unknown'}`)
  }

  const { data: companyA, error: companyAError } = await admin
    .from('companies')
    .insert({
      organization_id: orgA.id,
      name: `Company A ${runId}`,
      entity_kind: 'account',
    })
    .select('id')
    .single()
  if (companyAError || !companyA?.id) {
    throw new Error(`Company A konnte nicht angelegt werden: ${companyAError?.message ?? 'unknown'}`)
  }

  const { data: companyB, error: companyBError } = await admin
    .from('companies')
    .insert({
      organization_id: orgB.id,
      name: `Company B ${runId}`,
      entity_kind: 'account',
    })
    .select('id')
    .single()
  if (companyBError || !companyB?.id) {
    throw new Error(`Company B konnte nicht angelegt werden: ${companyBError?.message ?? 'unknown'}`)
  }

  const salesRep = await createAuthUser(admin, {
    email: testEmail('sales', runId),
    password,
    organizationId: orgA.id,
    systemRole: 'member',
    functionRole: 'sales_rep',
  })
  const adminUser = await createAuthUser(admin, {
    email: testEmail('admin', runId),
    password,
    organizationId: orgA.id,
    systemRole: 'admin',
    functionRole: 'sales_leader',
  })
  const accountManager = await createAuthUser(admin, {
    email: testEmail('am', runId),
    password,
    organizationId: orgA.id,
    systemRole: 'member',
    functionRole: 'account_manager',
  })

  const draftByAdminId = await insertReference(admin, {
    organizationId: orgA.id,
    companyId: companyA.id,
    title: `Draft by admin ${runId}`,
    status: 'draft',
    createdBy: adminUser.id,
  })
  const approvedId = await insertReference(admin, {
    organizationId: orgA.id,
    companyId: companyA.id,
    title: `Approved ${runId}`,
    status: 'approved',
    createdBy: adminUser.id,
  })
  const ndaId = await insertReference(admin, {
    organizationId: orgA.id,
    companyId: companyA.id,
    title: `NDA ${runId}`,
    status: 'approved',
    createdBy: adminUser.id,
    isNdaDeal: true,
  })
  const orgBReferenceId = await insertReference(admin, {
    organizationId: orgB.id,
    companyId: companyB.id,
    title: `Org B ref ${runId}`,
    status: 'approved',
  })

  return {
    runId,
    orgAId: orgA.id,
    orgBId: orgB.id,
    companyAId: companyA.id,
    companyBId: companyB.id,
    salesRep,
    admin: adminUser,
    accountManager,
    references: {
      draftByAdminId,
      approvedId,
      ndaId,
      orgBReferenceId,
    },
  }
}

export async function cleanupIntegrationOrgFixtures(
  admin: SupabaseClient<Database>,
  fixtures: IntegrationOrgFixtures
): Promise<void> {
  const refIds = Object.values(fixtures.references)
  await admin.from('references').delete().in('id', refIds)
  await admin.from('companies').delete().in('id', [fixtures.companyAId, fixtures.companyBId])
  for (const user of [fixtures.salesRep, fixtures.admin, fixtures.accountManager]) {
    await admin.auth.admin.deleteUser(user.id)
  }
  await admin.from('organizations').delete().in('id', [fixtures.orgAId, fixtures.orgBId])
}

/** Smoke: anon client kann sich verbinden und Auth-API erreichen. */
export async function integrationStackReachable(): Promise<boolean> {
  const client = createIntegrationAnonClient()
  const { error } = await client.auth.getSession()
  return !error
}

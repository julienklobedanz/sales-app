import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/references/approval-workflow-internal-notifications', () => ({
  notifyInternalTeamInternalApproved: vi.fn().mockResolvedValue(true),
}))

import { confirmInternalApprovalFromToken } from '@/lib/references/complete-internal-approval'
import {
  cleanupIntegrationOrgFixtures,
  seedIntegrationOrgFixtures,
  type IntegrationOrgFixtures,
} from '@/lib/test/integration-fixtures'
import {
  createIntegrationAnonClient,
  createIntegrationServiceClient,
  isIntegrationSupabaseAvailable,
} from '@/lib/test/integration-supabase'

const describeIntegration = isIntegrationSupabaseAvailable() ? describe : describe.skip

describeIntegration('approval flow', () => {
  let fixtures: IntegrationOrgFixtures
  let admin: ReturnType<typeof createIntegrationServiceClient>
  let internalToken: string
  let customerToken: string
  let internalRefId: string
  let customerRefId: string

  beforeAll(async () => {
    admin = createIntegrationServiceClient()
    fixtures = await seedIntegrationOrgFixtures(admin)
    internalToken = randomUUID()
    customerToken = randomUUID()

    const { data: internalRef } = await admin
      .from('references')
      .insert({
        organization_id: fixtures.orgAId,
        company_id: fixtures.companyAId,
        title: `Internal approval ${fixtures.runId}`,
        status: 'internal_only',
        created_by: fixtures.admin.id,
        approval_internal_status: 'pending_internal',
        approval_internal_review_token: internalToken,
      })
      .select('id')
      .single()
    internalRefId = internalRef!.id

    const { data: customerRef } = await admin
      .from('references')
      .insert({
        organization_id: fixtures.orgAId,
        company_id: fixtures.companyAId,
        title: `Customer approval ${fixtures.runId}`,
        status: 'internal_only',
        created_by: fixtures.admin.id,
        approval_internal_status: 'approved_internal',
        customer_approval_status: 'pending',
        approval_token: customerToken,
      })
      .select('id')
      .single()
    customerRefId = customerRef!.id
  }, 120_000)

  afterAll(async () => {
    await admin.from('references').delete().in('id', [internalRefId, customerRefId])
    await cleanupIntegrationOrgFixtures(admin, fixtures)
  }, 120_000)

  it('bestätigt interne Freigabe per Review-Token', async () => {
    const result = await confirmInternalApprovalFromToken(admin, internalToken)
    expect(result).toMatchObject({
      success: true,
      referenceId: internalRefId,
      alreadyApproved: false,
    })

    const { data } = await admin
      .from('references')
      .select('approval_internal_status, approval_internal_review_token')
      .eq('id', internalRefId)
      .single()

    expect(data?.approval_internal_status).toBe('approved_internal')
    expect(data?.approval_internal_review_token).toBeNull()
  })

  it('schließt Kundenfreigabe per approval_token RPC ab', async () => {
    const anon = createIntegrationAnonClient()
    const { data, error } = await anon.rpc('complete_client_approval', {
      p_token: customerToken,
      p_decision: 'approved',
      p_comment: 'Integration OK',
    })

    expect(error).toBeNull()
    expect(data).toMatchObject({ success: true })

    const { data: ref } = await admin
      .from('references')
      .select('status, customer_approval_status, approval_token')
      .eq('id', customerRefId)
      .single()

    expect(ref?.customer_approval_status).toBe('approved')
    expect(ref?.status).toBe('external')
    // Magic Link bleibt nach Freigabe aktiv (Anmerkungen ändern); nur Ablehnung invalidiert.
    expect(ref?.approval_token).toBe(customerToken)
  })
})

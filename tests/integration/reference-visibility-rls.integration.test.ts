import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  cleanupIntegrationOrgFixtures,
  seedIntegrationOrgFixtures,
  type IntegrationOrgFixtures,
} from '@/lib/test/integration-fixtures'
import {
  createIntegrationServiceClient,
  isIntegrationSupabaseAvailable,
  signInIntegrationUser,
} from '@/lib/test/integration-supabase'

const describeIntegration = isIntegrationSupabaseAvailable() ? describe : describe.skip

describeIntegration('reference visibility RLS', () => {
  let fixtures: IntegrationOrgFixtures
  let admin: ReturnType<typeof createIntegrationServiceClient>

  beforeAll(async () => {
    admin = createIntegrationServiceClient()
    fixtures = await seedIntegrationOrgFixtures(admin)
  }, 120_000)

  afterAll(async () => {
    await cleanupIntegrationOrgFixtures(admin, fixtures)
  }, 120_000)

  it('sales_rep sieht keine fremden Entwürfe und keine NDA-Referenzen', async () => {
    const client = await signInIntegrationUser(fixtures.salesRep.email, fixtures.salesRep.password)
    const { data, error } = await client
      .from('references')
      .select('id, status, is_nda_deal')
      .eq('organization_id', fixtures.orgAId)

    expect(error).toBeNull()
    const ids = new Set((data ?? []).map((row) => row.id))
    expect(ids.has(fixtures.references.draftByAdminId)).toBe(false)
    expect(ids.has(fixtures.references.ndaId)).toBe(false)
    expect(ids.has(fixtures.references.approvedId)).toBe(true)
  })

  it('account_manager sieht Entwürfe und NDA in der eigenen Org', async () => {
    const client = await signInIntegrationUser(
      fixtures.accountManager.email,
      fixtures.accountManager.password
    )
    const { data, error } = await client
      .from('references')
      .select('id')
      .eq('organization_id', fixtures.orgAId)

    expect(error).toBeNull()
    const ids = new Set((data ?? []).map((row) => row.id))
    expect(ids.has(fixtures.references.draftByAdminId)).toBe(true)
    expect(ids.has(fixtures.references.ndaId)).toBe(true)
  })

  it('sales_rep sieht eigene Entwürfe auch ohne Capability-Override', async () => {
    const ownDraftId = (
      await admin
        .from('references')
        .insert({
          organization_id: fixtures.orgAId,
          company_id: fixtures.companyAId,
          title: `Own draft ${fixtures.runId}`,
          status: 'draft',
          created_by: fixtures.salesRep.id,
        })
        .select('id')
        .single()
    ).data?.id

    expect(ownDraftId).toBeTruthy()

    const client = await signInIntegrationUser(fixtures.salesRep.email, fixtures.salesRep.password)
    const { data } = await client.from('references').select('id').eq('id', ownDraftId!).maybeSingle()
    expect(data?.id).toBe(ownDraftId)

    await admin.from('references').delete().eq('id', ownDraftId!)
  })
})

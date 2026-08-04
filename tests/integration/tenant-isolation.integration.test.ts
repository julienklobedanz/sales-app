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

describeIntegration('tenant isolation', () => {
  let fixtures: IntegrationOrgFixtures
  let admin: ReturnType<typeof createIntegrationServiceClient>

  beforeAll(async () => {
    admin = createIntegrationServiceClient()
    fixtures = await seedIntegrationOrgFixtures(admin)
  }, 120_000)

  afterAll(async () => {
    await cleanupIntegrationOrgFixtures(admin, fixtures)
  }, 120_000)

  it('Org-A-User sieht keine Referenzen von Org B', async () => {
    const client = await signInIntegrationUser(
      fixtures.admin.email,
      fixtures.admin.password,
    )
    const { data, error } = await client
      .from('references')
      .select('id, organization_id')
      .eq('id', fixtures.references.orgBReferenceId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('Org-A-User sieht keine Companies von Org B', async () => {
    const client = await signInIntegrationUser(
      fixtures.admin.email,
      fixtures.admin.password,
    )
    const { data, error } = await client
      .from('companies')
      .select('id')
      .eq('id', fixtures.companyBId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull()
  })
})

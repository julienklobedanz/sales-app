import { describe, expect, it } from 'vitest'

import {
  cleanupIntegrationOrgFixtures,
  integrationStackReachable,
  seedIntegrationOrgFixtures,
} from '@/lib/test/integration-fixtures'
import {
  createIntegrationServiceClient,
  isIntegrationSupabaseAvailable,
} from '@/lib/test/integration-supabase'

const describeIntegration = isIntegrationSupabaseAvailable() ? describe : describe.skip

describeIntegration('integration smoke', () => {
  it('erreicht den lokalen Supabase-Stack', async () => {
    expect(await integrationStackReachable()).toBe(true)
  })

  it('kann Mandanten-Fixtures seeden und aufräumen', async () => {
    const admin = createIntegrationServiceClient()
    const fixtures = await seedIntegrationOrgFixtures(admin)
    expect(fixtures.orgAId).toBeTruthy()
    expect(fixtures.salesRep.id).toBeTruthy()
    await cleanupIntegrationOrgFixtures(admin, fixtures)
  })
})

describe('integration harness', () => {
  it('skippt Integrationstests ohne SUPABASE_TEST_* / supabase status env', () => {
    if (process.env.CI === 'true' && process.env.SUPABASE_TEST_ANON_KEY) {
      expect(isIntegrationSupabaseAvailable()).toBe(true)
      return
    }
    expect(typeof isIntegrationSupabaseAvailable()).toBe('boolean')
  })
})

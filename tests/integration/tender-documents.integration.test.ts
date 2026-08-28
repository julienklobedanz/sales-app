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
import {
  assignDealToExistingTender,
  createTenderAndAssignDeal,
  detachDealFromTender,
} from '@/lib/tenders/assign-deal'

const describeIntegration = isIntegrationSupabaseAvailable() ? describe : describe.skip

describeIntegration('tender document ownership', () => {
  let fixtures: IntegrationOrgFixtures
  let admin: ReturnType<typeof createIntegrationServiceClient>
  let asOrg: Awaited<ReturnType<typeof signInIntegrationUser>>
  const dealIds: string[] = []
  const documentIds: string[] = []
  let tenderId: string | null = null

  beforeAll(async () => {
    admin = createIntegrationServiceClient()
    fixtures = await seedIntegrationOrgFixtures(admin)
    asOrg = await signInIntegrationUser(fixtures.admin.email, fixtures.admin.password)
  }, 120_000)

  afterAll(async () => {
    if (documentIds.length) {
      await admin.from('deal_documents').delete().in('id', documentIds)
    }
    if (dealIds.length) await admin.from('deals').delete().in('id', dealIds)
    if (tenderId) await admin.from('tenders').delete().eq('id', tenderId)
    await cleanupIntegrationOrgFixtures(admin, fixtures)
  }, 120_000)

  async function insertDeal(title: string) {
    const { data, error } = await admin
      .from('deals')
      .insert({
        organization_id: fixtures.orgAId,
        company_id: fixtures.companyAId,
        title,
        status: 'open',
      })
      .select('id')
      .single()
    if (!data?.id) throw new Error(error?.message ?? 'Deal fehlgeschlagen')
    dealIds.push(data.id)
    return data.id
  }

  async function insertDocument(
    client: typeof asOrg,
    args: {
      dealId?: string
      tenderId?: string
      storagePath: string
    },
  ) {
    const { data, error } = await client
      .from('deal_documents')
      .insert({
        deal_id: args.dealId ?? null,
        tender_id: args.tenderId ?? null,
        organization_id: fixtures.orgAId,
        file_name: 'RFP.pdf',
        kind: 'ausschreibung',
        storage_path: args.storagePath,
      })
      .select('id')
      .single()
    if (!data?.id) throw new Error(error?.message ?? 'Dokument fehlgeschlagen')
    documentIds.push(data.id)
    return data.id
  }

  it('does not promote on assign and demotes on last detach without moving storage_path', async () => {
    const deal1 = await insertDeal(`Los 1 ${fixtures.runId}`)
    const deal2 = await insertDeal(`Los 2 ${fixtures.runId}`)
    const lotStoragePath = `${fixtures.orgAId}/deals/${deal1}/doc-lot/RFP.pdf`
    const lotDocId = await insertDocument(asOrg, {
      dealId: deal1,
      storagePath: lotStoragePath,
    })

    const created = await createTenderAndAssignDeal(asOrg, {
      organizationId: fixtures.orgAId,
      dealId: deal1,
      title: `BMI docs ${fixtures.runId}`,
    })
    expect(created.success, created.error).toBe(true)
    tenderId = created.tenderId ?? null
    expect(tenderId).toBeTruthy()

    const assigned2 = await assignDealToExistingTender(asOrg, {
      organizationId: fixtures.orgAId,
      dealId: deal2,
      tenderId: tenderId!,
    })
    expect(assigned2.success, assigned2.error).toBe(true)

    const { data: stillOnLot } = await admin
      .from('deal_documents')
      .select('deal_id, tender_id, storage_path')
      .eq('id', lotDocId)
      .maybeSingle()
    expect(stillOnLot).toMatchObject({
      deal_id: deal1,
      tender_id: null,
      storage_path: lotStoragePath,
    })

    const tenderStoragePath = `${fixtures.orgAId}/tenders/${tenderId}/doc-tender/RFP.pdf`
    // Insert als Org-Nutzer — sonst umgeht service_role die Tender-Write-Policy.
    const tenderDocId = await insertDocument(asOrg, {
      tenderId: tenderId!,
      storagePath: tenderStoragePath,
    })

    const { count: beforeDetach } = await admin
      .from('deal_documents')
      .select('id', { count: 'exact', head: true })
      .or(`deal_id.in.(${deal1},${deal2}),tender_id.eq.${tenderId}`)

    const detachNonLast = await detachDealFromTender(asOrg, {
      organizationId: fixtures.orgAId,
      dealId: deal2,
    })
    expect(detachNonLast.success, detachNonLast.error).toBe(true)

    const { data: tenderStill } = await admin
      .from('tenders')
      .select('id')
      .eq('id', tenderId!)
      .maybeSingle()
    expect(tenderStill?.id).toBe(tenderId)

    const { data: stillTenderOwned } = await admin
      .from('deal_documents')
      .select('deal_id, tender_id, storage_path')
      .eq('id', tenderDocId)
      .maybeSingle()
    expect(stillTenderOwned).toMatchObject({
      deal_id: null,
      tender_id: tenderId,
      storage_path: tenderStoragePath,
    })

    const detachLast = await detachDealFromTender(asOrg, {
      organizationId: fixtures.orgAId,
      dealId: deal1,
    })
    expect(detachLast.success, detachLast.error).toBe(true)

    const { data: gone } = await admin
      .from('tenders')
      .select('id')
      .eq('id', tenderId!)
      .maybeSingle()
    expect(gone).toBeNull()
    tenderId = null

    const { data: after } = await admin
      .from('deal_documents')
      .select('id, deal_id, tender_id, storage_path')
      .in('id', [lotDocId, tenderDocId])
    expect(after).toHaveLength(2)
    expect(after?.every((row) => row.tender_id == null)).toBe(true)
    expect(after?.find((row) => row.id === lotDocId)?.storage_path).toBe(lotStoragePath)
    expect(after?.find((row) => row.id === tenderDocId)?.storage_path).toBe(
      tenderStoragePath,
    )
    expect(after?.find((row) => row.id === tenderDocId)?.deal_id).toBe(deal1)

    const { count: afterDetach } = await admin
      .from('deal_documents')
      .select('id', { count: 'exact', head: true })
      .in('id', [lotDocId, tenderDocId])
    expect(afterDetach).toBe(beforeDetach)
    expect(afterDetach).toBe(2)
  })
})

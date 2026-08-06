import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/market-signals/discover-company-newsroom', () => ({
  scheduleCompanyNewsroomDiscovery: vi.fn(),
  discoverAndSaveCompanyNewsrooms: vi.fn(),
}))

vi.mock('@/lib/accounts/resolve-account-for-import', () => ({
  enrichBulkImportRowFromBrandfetch: vi.fn(
    async (row: {
      name: string
      website: string
      industry: string
      headquarters: string
      employeeCount: number | null
    }) => ({
      name: row.name,
      website: row.website ?? '',
      industry: row.industry ?? '',
      headquarters: row.headquarters ?? '',
      employeeCount: row.employeeCount ?? null,
      logo_url: null,
      description: null,
    }),
  ),
}))

const createServerSupabaseClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: (...args: unknown[]) => createServerSupabaseClient(...args),
}))

import { bulkCreateCompaniesFromSheetImpl } from './account-crud-impl'

function authClient(opts: {
  userId: string | null
  profile: {
    organization_id: string | null
    system_role: string
    function_role: string
  } | null
  existingNames?: string[]
  insertResult?: { data: { id: string } | null; error: { message: string } | null }
}) {
  const insert = vi.fn().mockReturnValue({
    select: () => ({
      maybeSingle: () =>
        Promise.resolve(opts.insertResult ?? { data: { id: 'co-1' }, error: null }),
    }),
  })

  return {
    auth: {
      getUser: async () => ({
        data: { user: opts.userId ? { id: opts.userId } : null },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: opts.profile, error: null }),
            }),
          }),
        }
      }
      if (table === 'companies') {
        return {
          select: () => ({
            eq: () => ({
              eq: () =>
                Promise.resolve({
                  data: (opts.existingNames ?? []).map((name) => ({ name })),
                  error: null,
                }),
            }),
          }),
          insert,
        }
      }
      throw new Error(`unexpected table ${table}`)
    }),
    insert,
  }
}

function sheetBuffer(rows: Record<string, unknown>[]): Uint8Array {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Accounts')
  return new Uint8Array(
    XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
  )
}

describe('bulkCreateCompaniesFromSheetImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers', async () => {
    createServerSupabaseClient.mockResolvedValue(
      authClient({ userId: null, profile: null }),
    )

    await expect(
      bulkCreateCompaniesFromSheetImpl(sheetBuffer([{ Name: 'Acme' }])),
    ).resolves.toEqual({
      success: false,
      createdCount: 0,
      skippedCount: 0,
      failedCount: 0,
      error: 'Nicht eingeloggt.',
    })
  })

  it('rejects sales_rep (sales-restricted)', async () => {
    createServerSupabaseClient.mockResolvedValue(
      authClient({
        userId: 'u1',
        profile: {
          organization_id: 'org-1',
          system_role: 'member',
          function_role: 'sales_rep',
        },
      }),
    )

    await expect(
      bulkCreateCompaniesFromSheetImpl(sheetBuffer([{ Name: 'Acme' }])),
    ).resolves.toEqual({
      success: false,
      createdCount: 0,
      skippedCount: 0,
      failedCount: 0,
      error: 'Keine Berechtigung.',
    })
  })

  it('creates new accounts from sheet for admin', async () => {
    const client = authClient({
      userId: 'admin-1',
      profile: {
        organization_id: 'org-1',
        system_role: 'admin',
        function_role: 'sales_leader',
      },
      existingNames: ['Existing GmbH'],
    })
    createServerSupabaseClient.mockResolvedValue(client)

    await expect(
      bulkCreateCompaniesFromSheetImpl(
        sheetBuffer([
          { Name: 'Acme Corp', Branche: 'IT' },
          { Name: 'Existing GmbH' },
          { Website: 'https://no-name.example' },
        ]),
      ),
    ).resolves.toEqual({
      success: true,
      createdCount: 1,
      skippedCount: 2,
      failedCount: 0,
    })

    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-1',
        entity_kind: 'account',
        name: 'Acme Corp',
        industry: 'IT',
      }),
    )
  })
})

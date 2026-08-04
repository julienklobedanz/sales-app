import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'

vi.mock('server-only', () => ({}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/observability/logger', () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const createServerSupabaseClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: (...args: unknown[]) => createServerSupabaseClient(...args),
}))

import { importDealsFromXlsxImpl } from './deal-import-request-impl'

function profileChain(profile: { organization_id: string | null } | null) {
  return {
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: profile, error: null }),
      }),
    }),
  }
}

function buildXlsxFile(rows: Record<string, unknown>[]): File {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Deals')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return new File([buf], 'deals.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('importDealsFromXlsxImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers', async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
      from: vi.fn(),
    })
    const fd = new FormData()
    fd.set('file', buildXlsxFile([{ Titel: 'A' }]))

    await expect(importDealsFromXlsxImpl(fd)).resolves.toEqual({
      success: false,
      error: 'Nicht angemeldet.',
    })
  })

  it('rejects callers without organization', async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profileChain({ organization_id: null })
        throw new Error(`unexpected ${table}`)
      }),
    })
    const fd = new FormData()
    fd.set('file', buildXlsxFile([{ Titel: 'A' }]))

    await expect(importDealsFromXlsxImpl(fd)).resolves.toEqual({
      success: false,
      error: 'Keine Organisation zugeordnet.',
    })
  })

  it('rejects missing file', async () => {
    createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profileChain({ organization_id: 'org-1' })
        throw new Error(`unexpected ${table}`)
      }),
    })

    await expect(importDealsFromXlsxImpl(new FormData())).resolves.toEqual({
      success: false,
      error: 'Keine Datei übergeben.',
    })
  })

  it('imports valid rows as open deals', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: vi.fn((table: string) => {
        if (table === 'profiles') return profileChain({ organization_id: 'org-1' })
        if (table === 'deals') return { insert }
        throw new Error(`unexpected ${table}`)
      }),
    })

    const fd = new FormData()
    fd.set(
      'file',
      buildXlsxFile([
        { Titel: 'Deal Alpha', Branche: 'IT', Volumen: '100000' },
        { Titel: '', Branche: 'skip-me' },
      ])
    )

    await expect(importDealsFromXlsxImpl(fd)).resolves.toEqual({
      success: true,
      created: 1,
    })
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-1',
        title: 'Deal Alpha',
        industry: 'IT',
        volume: '100000',
        status: 'open',
        is_public: true,
      })
    )
  })
})

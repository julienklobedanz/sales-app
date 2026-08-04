import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const getRequestUser = vi.fn()
const getRequestProfile = vi.fn()

vi.mock('@/lib/auth/request-user', () => ({
  getRequestUser: (...args: unknown[]) => getRequestUser(...args),
  getRequestProfile: (...args: unknown[]) => getRequestProfile(...args),
}))

const createServerSupabaseClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: (...args: unknown[]) => createServerSupabaseClient(...args),
}))

import { deleteDealImpl } from './deal-crud-impl'

function chainResolving(result: unknown) {
  const chain: Record<string, unknown> = {}
  const api = {
    select: () => api,
    eq: () => api,
    in: () => api,
    delete: () => api,
    remove: () => Promise.resolve({ error: null }),
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  }
  Object.assign(chain, api)
  return api
}

describe('deleteDealImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers', async () => {
    getRequestUser.mockResolvedValue(null)
    getRequestProfile.mockResolvedValue(null)
    createServerSupabaseClient.mockResolvedValue({ from: vi.fn() })

    await expect(deleteDealImpl('deal-1')).resolves.toEqual({
      success: false,
      error: 'Nicht angemeldet.',
    })
  })

  it('rejects callers without organization', async () => {
    getRequestUser.mockResolvedValue({ id: 'user-1' })
    getRequestProfile.mockResolvedValue({ organization_id: null })
    createServerSupabaseClient.mockResolvedValue({ from: vi.fn() })

    await expect(deleteDealImpl('deal-1')).resolves.toEqual({
      success: false,
      error: 'Keine Organisation zugeordnet.',
    })
  })

  it('rejects when deal is missing in org', async () => {
    getRequestUser.mockResolvedValue({ id: 'user-1' })
    getRequestProfile.mockResolvedValue({
      organization_id: 'org-1',
      system_role: 'admin',
      function_role: 'sales_leader',
    })
    createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => chainResolving({ data: null, error: null })),
    })

    await expect(deleteDealImpl('deal-missing')).resolves.toEqual({
      success: false,
      error: 'Deal nicht gefunden.',
    })
  })

  it('rejects sales_rep without deal ownership', async () => {
    getRequestUser.mockResolvedValue({ id: 'user-other' })
    getRequestProfile.mockResolvedValue({
      organization_id: 'org-1',
      system_role: 'member',
      function_role: 'sales_rep',
    })
    createServerSupabaseClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'deals') {
          return chainResolving({
            data: {
              id: 'deal-1',
              sales_manager_id: 'user-owner',
              account_manager_id: null,
            },
            error: null,
          })
        }
        return chainResolving({ data: [], error: null })
      }),
    })

    await expect(deleteDealImpl('deal-1')).resolves.toEqual({
      success: false,
      error: 'Keine Berechtigung, diesen Deal zu löschen.',
    })
  })

  it('deletes deal when admin and no documents', async () => {
    getRequestUser.mockResolvedValue({ id: 'admin-1' })
    getRequestProfile.mockResolvedValue({
      organization_id: 'org-1',
      system_role: 'admin',
      function_role: 'sales_leader',
    })

    const from = vi.fn((table: string) => {
      if (table === 'deals') {
        // first call: select/maybeSingle; later: delete
        const selectApi = chainResolving({
          data: {
            id: 'deal-1',
            sales_manager_id: null,
            account_manager_id: null,
          },
          error: null,
        })
        const deleteApi = chainResolving({ error: null })
        return {
          select: () => selectApi,
          delete: () => deleteApi,
        }
      }
      if (table === 'deal_documents' || table === 'deal_desk_projects') {
        return chainResolving({ data: [], error: null })
      }
      throw new Error(`unexpected table ${table}`)
    })

    createServerSupabaseClient.mockResolvedValue({ from })

    await expect(deleteDealImpl('deal-1')).resolves.toEqual({ success: true })
    expect(from).toHaveBeenCalledWith('deals')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const revalidateTenderSurfaces = vi.fn()
vi.mock('./revalidate-tender-surfaces', () => ({
  revalidateTenderSurfaces: (...args: unknown[]) => revalidateTenderSurfaces(...args),
}))

import { parseTenderStammdatenPatch, updateTenderStammdaten } from './update-tender'

const baseFields = {
  title: 'BMI 2026',
  procedureType: 'open' as string | null,
  referenceNumber: 'Z1',
  totalVolume: '100',
  maxLotsBid: '',
  maxLotsAward: '',
  lotPriorityRequired: 'unknown' as const,
}

describe('parseTenderStammdatenPatch', () => {
  it('leere Zahl wird null, 0 ist ein Fehler', () => {
    const empty = parseTenderStammdatenPatch({ ...baseFields, maxLotsBid: '' })
    expect(empty).toMatchObject({ ok: true, patch: { max_lots_bid: null } })
    expect(parseTenderStammdatenPatch({ ...baseFields, maxLotsAward: '0' }).ok).toBe(
      false,
    )
  })

  it('unterscheidet Priorisierung null und false', () => {
    expect(parseTenderStammdatenPatch(baseFields)).toMatchObject({
      ok: true,
      patch: { lot_priority_required: null },
    })
    expect(
      parseTenderStammdatenPatch({ ...baseFields, lotPriorityRequired: 'no' }),
    ).toMatchObject({ ok: true, patch: { lot_priority_required: false } })
    expect(
      parseTenderStammdatenPatch({ ...baseFields, lotPriorityRequired: 'yes' }),
    ).toMatchObject({ ok: true, patch: { lot_priority_required: true } })
  })

  it('lehnt leeren Titel ab', () => {
    expect(parseTenderStammdatenPatch({ ...baseFields, title: '  ' }).ok).toBe(false)
  })
})

describe('updateTenderStammdaten', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    revalidateTenderSurfaces.mockResolvedValue(undefined)
  })

  it('schreibt false für Priorisierung und null für leere Zahlen', async () => {
    const update = vi.fn().mockReturnValue({
      eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
    })
    const supabase = { from: () => ({ update }) }

    const result = await updateTenderStammdaten(supabase as never, {
      organizationId: 'org-1',
      tenderId: 'tender-1',
      fields: { ...baseFields, maxLotsAward: '3', lotPriorityRequired: 'no' },
    })

    expect(result).toEqual({ success: true })
    expect(update.mock.calls[0]![0]).toMatchObject({
      max_lots_bid: null,
      max_lots_award: 3,
      lot_priority_required: false,
    })
    expect(revalidateTenderSurfaces).toHaveBeenCalled()
  })
})

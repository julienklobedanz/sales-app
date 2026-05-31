import { describe, expect, it } from 'vitest'

import { resolveNdaDisplayStatus } from './company-entity'

describe('resolveNdaDisplayStatus', () => {
  it('returns none when no rows or no uploaded PDF', () => {
    expect(resolveNdaDisplayStatus([])).toBe('none')
    expect(
      resolveNdaDisplayStatus([
        { status: 'active', valid_until: null, file_storage_path: null },
      ])
    ).toBe('none')
    expect(
      resolveNdaDisplayStatus([
        { status: 'active', valid_until: '2030-01-01', file_storage_path: '  ' },
      ])
    ).toBe('none')
  })

  it('returns active for documented active NDA without expiry warning', () => {
    expect(
      resolveNdaDisplayStatus([
        {
          status: 'active',
          valid_until: '2030-06-01',
          file_storage_path: 'org/co/nda/file.pdf',
        },
      ])
    ).toBe('active')
  })

  it('returns expiring for pending documented NDA', () => {
    expect(
      resolveNdaDisplayStatus([
        {
          status: 'pending',
          valid_until: null,
          file_storage_path: 'org/co/nda/file.pdf',
        },
      ])
    ).toBe('expiring')
  })

  it('ignores metadata-only rows when a valid documented NDA exists', () => {
    expect(
      resolveNdaDisplayStatus([
        { status: 'active', valid_until: null, file_storage_path: null },
        {
          status: 'active',
          valid_until: '2030-06-01',
          file_storage_path: 'org/co/nda/file.pdf',
        },
      ])
    ).toBe('active')
  })
})

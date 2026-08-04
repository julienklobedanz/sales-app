import { describe, expect, it } from 'vitest'

import { uniqueStoragePaths } from '@/lib/deals/deal-delete-storage'

describe('deal-delete-storage', () => {
  it('deduplicates and drops empty paths', () => {
    expect(
      uniqueStoragePaths([
        'org/deals/d1/a/file.pdf',
        'org/deals/d1/a/file.pdf',
        '',
        null,
        undefined,
        '  ',
        'org/deals/d1/b/other.pdf',
      ]),
    ).toEqual(['org/deals/d1/a/file.pdf', 'org/deals/d1/b/other.pdf'])
  })

  it('returns empty array when no paths', () => {
    expect(uniqueStoragePaths([])).toEqual([])
    expect(uniqueStoragePaths([null, ''])).toEqual([])
  })
})

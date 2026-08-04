import { describe, expect, it } from 'vitest'

import { normalizeEmbeddingQueryText } from '@/lib/embeddings/normalize-embedding-query'

describe('normalizeEmbeddingQueryText', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeEmbeddingQueryText('  Cloud   Migration \n SAP  ')).toBe(
      'Cloud Migration SAP',
    )
  })

  it('returns empty for blank input', () => {
    expect(normalizeEmbeddingQueryText('   ')).toBe('')
  })
})

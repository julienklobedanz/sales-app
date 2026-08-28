import { describe, expect, it } from 'vitest'

import {
  buildExtractedSubmissionItemSourceKey,
  buildManualSubmissionItemSourceKey,
  normalizeSubmissionIdentifier,
} from '@/lib/deals/submission-item-source-key'

describe('submission item source_key', () => {
  const sourceDocumentId = 'doc-abc-123'

  it('keeps the key when the title changes and the identifier stays', () => {
    const a = buildExtractedSubmissionItemSourceKey(sourceDocumentId, {
      identifier: 'A1',
      title: 'Bewerbungsbogen',
    })
    const b = buildExtractedSubmissionItemSourceKey(sourceDocumentId, {
      identifier: 'A1',
      title: 'Bewerbungsbogen (aktualisiert)',
    })
    expect(a).toBe(b)
    expect(a).toHaveLength(32)
  })

  it('normalizes identifier spacing and case', () => {
    expect(normalizeSubmissionIdentifier(' a6a ')).toBe('A6A')
    const spaced = buildExtractedSubmissionItemSourceKey(sourceDocumentId, {
      identifier: 'a6a',
      title: 'x',
    })
    const compact = buildExtractedSubmissionItemSourceKey(sourceDocumentId, {
      identifier: ' A6A ',
      title: 'y',
    })
    expect(spaced).toBe(compact)
  })

  it('falls back to the normalized title without identifier', () => {
    const a = buildExtractedSubmissionItemSourceKey(sourceDocumentId, {
      title: 'Eigenerklärung zur Eignung',
    })
    const b = buildExtractedSubmissionItemSourceKey(sourceDocumentId, {
      title: '  Eigenerklärung  zur   Eignung ',
    })
    expect(a).toBe(b)
    expect(a).not.toBe(
      buildExtractedSubmissionItemSourceKey(sourceDocumentId, {
        identifier: 'A2',
        title: 'Eigenerklärung zur Eignung',
      }),
    )
  })

  it('uses a different key per source document, not per deadline', () => {
    const item = { identifier: 'A1', title: 'Bewerbungsbogen' }
    expect(buildExtractedSubmissionItemSourceKey('doc-1', item)).not.toBe(
      buildExtractedSubmissionItemSourceKey('doc-2', item),
    )
    expect(buildExtractedSubmissionItemSourceKey('doc-1', item)).toBe(
      buildExtractedSubmissionItemSourceKey('doc-1', item),
    )
  })

  it('prefixes a manual key without a document', () => {
    const key = buildManualSubmissionItemSourceKey()
    expect(key.startsWith('manual:')).toBe(true)
    expect(key).not.toBe(buildManualSubmissionItemSourceKey())
  })
})

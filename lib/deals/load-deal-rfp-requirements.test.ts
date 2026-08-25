import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { attachRequirementSourceNames } from './load-deal-rfp-requirements'
import { requirementIdForSmeTask } from './requirement-id-for-sme-task'

describe('attachRequirementSourceNames', () => {
  it('setzt den Dateinamen aus den Deal-Dokumenten', () => {
    const rows = attachRequirementSourceNames(
      [
        {
          id: 'req-1',
          text: 'ISO 27001',
          category: 'Security',
          source_document_id: 'doc-a',
        },
        {
          id: 'req-2',
          text: 'SLA 99,9 %',
          category: null,
          source_document_id: 'missing',
        },
      ],
      [{ id: 'doc-a', file_name: 'Leistungsverzeichnis.pdf' }],
    )
    expect(rows[0]).toEqual({
      id: 'req-1',
      text: 'ISO 27001',
      category: 'Security',
      sourceDocumentId: 'doc-a',
      sourceFileName: 'Leistungsverzeichnis.pdf',
    })
    expect(rows[1]?.sourceFileName).toBeNull()
  })
})

describe('requirementIdForSmeTask', () => {
  const ids = new Set(['abc-uuid', 'sme-already'])

  it('mappt sme- Prefix auf die Zeilen-UUID', () => {
    expect(requirementIdForSmeTask('sme-abc-uuid', ids)).toBe('abc-uuid')
  })

  it('trifft die UUID ohne Prefix', () => {
    expect(requirementIdForSmeTask('abc-uuid', ids)).toBe('abc-uuid')
  })

  it('liefert null ohne Treffer', () => {
    expect(requirementIdForSmeTask('sme-other', ids)).toBeNull()
  })
})

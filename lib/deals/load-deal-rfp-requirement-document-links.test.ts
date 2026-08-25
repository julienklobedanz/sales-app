import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { attachRequirementLinkedDocuments } from './load-deal-rfp-requirement-document-links'

describe('attachRequirementLinkedDocuments', () => {
  it('reichert Links um Titel, Typ und Gültigkeit an', () => {
    const rows = attachRequirementLinkedDocuments(
      [
        { requirement_id: 'req-1', document_id: 'doc-1' },
        { requirement_id: 'req-1', document_id: 'missing' },
      ],
      [
        {
          id: 'doc-1',
          title: 'ISO 27001',
          document_type: 'iso_27001',
          valid_until: '2025-01-01',
        },
      ],
    )
    expect(rows).toEqual([
      {
        requirementId: 'req-1',
        documentId: 'doc-1',
        title: 'ISO 27001',
        documentType: 'iso_27001',
        validUntil: '2025-01-01',
      },
    ])
  })
})

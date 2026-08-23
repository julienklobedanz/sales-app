import { describe, expect, it } from 'vitest'

import type { ComplianceDocumentRow } from '@/app/(app)/settings/compliance-actions'
import {
  filterComplianceDocumentsForTable,
  groupComplianceDocumentsForTable,
} from './compliance-table-rows'

function row(
  partial: Partial<ComplianceDocumentRow> &
    Pick<ComplianceDocumentRow, 'id' | 'document_type'>,
): ComplianceDocumentRow {
  return {
    organization_id: 'org-1',
    title: partial.title ?? 'Test',
    valid_until: partial.valid_until ?? null,
    file_storage_path: null,
    file_name: null,
    is_current: partial.is_current ?? false,
    uploaded_by: null,
    created_at: partial.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: partial.updated_at ?? '2026-01-01T00:00:00Z',
    ...partial,
  }
}

describe('groupComplianceDocumentsForTable', () => {
  it('shows only the current version per document type', () => {
    const docs = [
      row({ id: 'a1', document_type: 'iso_27001', title: 'ISO 2024', is_current: false }),
      row({ id: 'a2', document_type: 'iso_27001', title: 'ISO 2026', is_current: true }),
      row({ id: 'b1', document_type: 'iso_9001', title: 'ISO 9001', is_current: true }),
    ]
    const grouped = groupComplianceDocumentsForTable(docs)
    expect(grouped.map((d) => d.id).sort()).toEqual(['a2', 'b1'])
  })
})

describe('filterComplianceDocumentsForTable', () => {
  it('matches archived versions in search but returns current row', () => {
    const docs = [
      row({
        id: 'old',
        document_type: 'iso_27001',
        title: 'Archiv 2023',
        is_current: false,
        updated_at: '2023-01-01T00:00:00Z',
      }),
      row({
        id: 'current',
        document_type: 'iso_27001',
        title: 'ISO 2026',
        is_current: true,
        updated_at: '2026-01-01T00:00:00Z',
      }),
    ]
    const filtered = filterComplianceDocumentsForTable({
      documents: docs,
      search: 'archiv',
      showExpired: true,
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id).toBe('current')
  })
})

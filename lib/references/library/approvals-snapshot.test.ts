import { describe, expect, it } from 'vitest'

import { computeApprovalStatusSnapshot } from './approvals-snapshot'
import type { ReferenceApprovalRow } from './approvals-types'

function row(partial: Partial<ReferenceApprovalRow>): ReferenceApprovalRow {
  return {
    title: 'T',
    status: 'draft',
    company_id: 'c1',
    contact_id: null,
    customer_contact_id: null,
    customer_approval_status: null,
    approval_reference_status_snapshot: null,
    companies: null,
    ...partial,
  }
}

describe('computeApprovalStatusSnapshot', () => {
  it('behält Snapshot bei pending customer approval', () => {
    expect(
      computeApprovalStatusSnapshot(
        row({
          customer_approval_status: 'pending',
          approval_reference_status_snapshot: 'internal_only',
          status: 'external',
        })
      )
    ).toBe('internal_only')
  })

  it('mappt legacy pending status auf draft wenn kein Snapshot', () => {
    expect(computeApprovalStatusSnapshot(row({ status: 'pending' }))).toBe('draft')
  })

  it('nutzt aktuellen Status sonst', () => {
    expect(computeApprovalStatusSnapshot(row({ status: 'approved' }))).toBe('approved')
  })
})

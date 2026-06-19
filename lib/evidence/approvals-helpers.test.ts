import { describe, expect, it } from 'vitest'

import {
  companyNameFromReferenceRow,
  withdrawRestoredReferenceStatus,
} from './approvals-helpers'

describe('companyNameFromReferenceRow', () => {
  it('liest Name aus Join-Objekt oder Array', () => {
    expect(companyNameFromReferenceRow({ name: 'Acme' })).toBe('Acme')
    expect(companyNameFromReferenceRow([{ name: 'Beta' }])).toBe('Beta')
    expect(companyNameFromReferenceRow(null)).toBe('Referenz')
  })
})

describe('withdrawRestoredReferenceStatus', () => {
  it('nutzt Snapshot oder draft', () => {
    expect(withdrawRestoredReferenceStatus('internal_only')).toBe('internal_only')
    expect(withdrawRestoredReferenceStatus('  ')).toBe('draft')
    expect(withdrawRestoredReferenceStatus(null)).toBe('draft')
  })
})

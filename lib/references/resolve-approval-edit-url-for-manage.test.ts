import { describe, expect, it } from 'vitest'
import { createHash } from 'crypto'
import { effectiveCustomerApprovalStatus } from './effective-customer-approval'

describe('resolveApprovalEditUrlForManageView prerequisites', () => {
  it('legacy external qualifies for approval edit', () => {
    expect(effectiveCustomerApprovalStatus(null, 'external')).toBe('approved')
  })

  it('manage token hash matches sha256 hex', () => {
    const token = 'test-manage-token'
    const hash = createHash('sha256').update(token, 'utf8').digest('hex')
    expect(hash).toHaveLength(64)
  })
})

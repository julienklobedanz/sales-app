import { describe, expect, it } from 'vitest'

import { referenceApprovalMetaHasContent } from './reference-internal-frame-supplement'

const emptyMeta = {
  requestedByDisplay: null,
  coordinatorDisplay: null,
  approvingCustomerDisplay: null,
  delegatedRecipientDisplay: null,
  customerAccessRevoked: false,
  approvalQuoteApproved: null,
  approvalQuoteProposed: null,
  approvalConsentFileUrl: null,
}

describe('referenceApprovalMetaHasContent', () => {
  it('ist leer ohne Felder', () => {
    expect(referenceApprovalMetaHasContent(emptyMeta)).toBe(false)
  })

  it('zählt vorhandene Workflow-Metadaten', () => {
    expect(
      referenceApprovalMetaHasContent({
        ...emptyMeta,
        requestedByDisplay: 'Ada',
      }),
    ).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'

import {
  canManageDealDocuments,
  canManageTenderDocuments,
} from '@/lib/deals/can-manage-deal-documents'
import {
  buildDealDocumentStoragePath,
  DEAL_DOCUMENT_ANALYZABLE_MAX_BYTES,
  DEAL_DOCUMENT_STORAGE_MAX_BYTES,
  sanitizeDealDocumentFileName,
  validateDealDocumentUpload,
} from '@/lib/deals/deal-document-upload'

describe('canManageDealDocuments', () => {
  const deal = {
    sales_manager_id: 'sales-1',
    account_manager_id: 'am-1',
  }

  it('allows system admin', () => {
    expect(canManageDealDocuments(deal, 'other', 'admin', 'sales_rep')).toBe(true)
  })

  it('allows account_manager function role org-wide', () => {
    expect(canManageDealDocuments(deal, 'other', 'member', 'account_manager')).toBe(true)
  })

  it('allows assigned sales manager', () => {
    expect(canManageDealDocuments(deal, 'sales-1', 'member', 'sales_rep')).toBe(true)
  })

  it('allows assigned account manager on deal', () => {
    expect(canManageDealDocuments(deal, 'am-1', 'member', 'sales_rep')).toBe(true)
  })

  it('denies unrelated sales rep', () => {
    expect(canManageDealDocuments(deal, 'other-rep', 'member', 'sales_rep')).toBe(false)
  })
})

describe('canManageTenderDocuments', () => {
  const lots = [
    { sales_manager_id: 'sales-1', account_manager_id: null },
    { sales_manager_id: null, account_manager_id: 'am-1' },
  ]

  it('allows assigned sales manager of any lot', () => {
    expect(canManageTenderDocuments(lots, 'sales-1', 'member', 'sales_rep')).toBe(true)
  })

  it('denies unrelated sales rep', () => {
    expect(canManageTenderDocuments(lots, 'other-rep', 'member', 'sales_rep')).toBe(false)
  })
})

describe('deal-document-upload', () => {
  it('sanitizes file names', () => {
    expect(sanitizeDealDocumentFileName('RFP Phase 1 (final).pdf')).toBe(
      'RFP_Phase_1__final_.pdf',
    )
  })

  it('builds storage path', () => {
    expect(
      buildDealDocumentStoragePath('org', { kind: 'deal', id: 'deal' }, 'doc', 'file.pdf'),
    ).toBe('org/deals/deal/doc/file.pdf')
  })

  it('builds tender storage path under tenders/', () => {
    expect(
      buildDealDocumentStoragePath(
        'org',
        { kind: 'tender', id: 'tender' },
        'doc',
        'file.pdf',
      ),
    ).toBe('org/tenders/tender/doc/file.pdf')
  })

  it('accepts storage-sized PDF for sonstiges', () => {
    const file = {
      name: 'notes.pdf',
      type: 'application/pdf',
      size: DEAL_DOCUMENT_STORAGE_MAX_BYTES,
    }
    expect(validateDealDocumentUpload(file, 'sonstiges').success).toBe(true)
  })

  it('rejects oversized ablage file', () => {
    const file = {
      name: 'big.pdf',
      type: 'application/pdf',
      size: DEAL_DOCUMENT_STORAGE_MAX_BYTES + 1,
    }
    expect(validateDealDocumentUpload(file, 'vertrag').success).toBe(false)
  })

  it('enforces analyzable limit for ausschreibung', () => {
    const file = {
      name: 'rfp.pdf',
      type: 'application/pdf',
      size: DEAL_DOCUMENT_ANALYZABLE_MAX_BYTES + 1,
    }
    expect(validateDealDocumentUpload(file, 'ausschreibung').success).toBe(false)
  })

  it('requires analyzable mime for ausschreibung', () => {
    const file = {
      name: 'scan.png',
      type: 'image/png',
      size: 1024,
    }
    expect(validateDealDocumentUpload(file, 'ausschreibung').success).toBe(false)
  })
})

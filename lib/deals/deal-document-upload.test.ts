import { describe, expect, it } from 'vitest'

import { canManageDealDocuments } from '@/lib/deals/can-manage-deal-documents'
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

describe('deal-document-upload', () => {
  it('sanitizes file names', () => {
    expect(sanitizeDealDocumentFileName('RFP Phase 1 (final).pdf')).toBe(
      'RFP_Phase_1__final_.pdf',
    )
  })

  it('builds storage path', () => {
    expect(buildDealDocumentStoragePath('org', 'deal', 'doc', 'file.pdf')).toBe(
      'org/deals/deal/doc/file.pdf',
    )
  })

  it('accepts storage-sized PDF for sonstiges', () => {
    const file = {
      name: 'notes.pdf',
      type: 'application/pdf',
      size: DEAL_DOCUMENT_STORAGE_MAX_BYTES,
    }
    expect(validateDealDocumentUpload(file, 'sonstiges').ok).toBe(true)
  })

  it('rejects oversized ablage file', () => {
    const file = {
      name: 'big.pdf',
      type: 'application/pdf',
      size: DEAL_DOCUMENT_STORAGE_MAX_BYTES + 1,
    }
    expect(validateDealDocumentUpload(file, 'vertrag').ok).toBe(false)
  })

  it('enforces analyzable limit for ausschreibung', () => {
    const file = {
      name: 'rfp.pdf',
      type: 'application/pdf',
      size: DEAL_DOCUMENT_ANALYZABLE_MAX_BYTES + 1,
    }
    expect(validateDealDocumentUpload(file, 'ausschreibung').ok).toBe(false)
  })

  it('requires analyzable mime for ausschreibung', () => {
    const file = {
      name: 'scan.png',
      type: 'image/png',
      size: 1024,
    }
    expect(validateDealDocumentUpload(file, 'ausschreibung').ok).toBe(false)
  })
})

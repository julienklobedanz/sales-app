import { describe, expect, it } from 'vitest'

import {
  buildComplianceStorageFileName,
  buildDefaultComplianceTitle,
  sanitizeComplianceFileNamePart,
} from '@/lib/compliance/upload-filename'

describe('sanitizeComplianceFileNamePart', () => {
  it('normalisiert Umlaute und Sonderzeichen', () => {
    expect(sanitizeComplianceFileNamePart('RefStack Demo Workspace')).toBe('RefStack_Demo_Workspace')
    expect(sanitizeComplianceFileNamePart('ISO 27001')).toBe('ISO_27001')
  })
})

describe('buildComplianceStorageFileName', () => {
  it('baut Firmenname_Typ_yyyymmdd.pdf', () => {
    expect(
      buildComplianceStorageFileName({
        organizationName: 'RefStack Demo Workspace',
        documentType: 'iso_27001',
        uploadedAt: new Date('2026-05-30T12:00:00Z'),
      })
    ).toBe('RefStack_Demo_Workspace_ISO_27001_20260530.pdf')
  })
})

describe('buildDefaultComplianceTitle', () => {
  it('setzt Dokumenttyp und Jahr', () => {
    expect(buildDefaultComplianceTitle('iso_27001', undefined, 2026)).toBe('ISO 27001 2026')
  })
})

import { describe, expect, it } from 'vitest'

import {
  isSuspiciousBulkImportProjectName,
  sanitizeExtractedProjectTitle,
} from './bulk-import-preview-utils'

describe('isSuspiciousBulkImportProjectName', () => {
  it('erkennt Projektzeitraum und Datumsbereiche', () => {
    expect(
      isSuspiciousBulkImportProjectName('Projektzeitraum 01.09.2023 – 28.02.2025'),
    ).toBe(true)
    expect(isSuspiciousBulkImportProjectName('01.02.2025 – 31.08.2025')).toBe(true)
  })

  it('lässt normale Projekttitel durch', () => {
    expect(
      isSuspiciousBulkImportProjectName('Managed Cloud Platform – Financial Services'),
    ).toBe(false)
  })

  it('entfernt „es“-Präfix von PDF-Zeilenumbruch in References', () => {
    expect(
      sanitizeExtractedProjectTitle(
        'es Next-Gen Customer Data Platform & Churn Prevention',
      ),
    ).toBe('Next-Gen Customer Data Platform & Churn Prevention')
    expect(sanitizeExtractedProjectTitle('Cloud-Native Integration Gateway')).toBe(
      'Cloud-Native Integration Gateway',
    )
  })
})

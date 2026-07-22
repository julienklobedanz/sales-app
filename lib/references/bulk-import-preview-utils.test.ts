import { describe, expect, it } from 'vitest'

import { isSuspiciousBulkImportProjectName } from './bulk-import-preview-utils'

describe('isSuspiciousBulkImportProjectName', () => {
  it('erkennt Projektzeitraum und Datumsbereiche', () => {
    expect(isSuspiciousBulkImportProjectName('Projektzeitraum 01.09.2023 – 28.02.2025')).toBe(true)
    expect(isSuspiciousBulkImportProjectName('01.02.2025 – 31.08.2025')).toBe(true)
  })

  it('lässt normale Projekttitel durch', () => {
    expect(
      isSuspiciousBulkImportProjectName('Managed Cloud Platform – Financial Services')
    ).toBe(false)
  })
})

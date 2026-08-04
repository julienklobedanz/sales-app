import { describe, expect, it } from 'vitest'

import {
  autoGroupBulkImportByFileName,
  extractCompanyNameFromFileName,
  extractProjectTitleHintFromFileName,
  groupingKeyFromFileName,
} from './bulk-import-grouping'

describe('bulk-import-grouping', () => {
  const file = (name: string) => new File(['x'], name, { type: 'application/pdf' })

  it('trennt Referenz-Dateien mit unterschiedlichen Kunden im Dateinamen', () => {
    const names = [
      'Referenz_Deutsche_Lufthansa_AG_KI_Platform.pdf',
      'Referenz_SAP_SE_Cloud_Migration.pdf',
      'Referenz_Allianz_SE_Data_Platform.pdf',
      'Referenz_BMW_Gruppe_Digitalisierung.pdf',
      'Referenz_BASF_SE_MES.pdf',
      'Referenz_Siemens_AG_IoT.pdf',
      'Referenz_REWE_Gruppe_Rollout.pdf',
    ]

    expect(new Set(names.map(groupingKeyFromFileName)).size).toBe(names.length)
  })

  it('gruppiert mehrere Dateien desselben Kunden weiterhin zusammen', () => {
    const files = [
      file('Referenz_SAP_SE_Teil_1.pdf'),
      file('Referenz_SAP_SE_Teil_2.pdf'),
      file('Referenz_BMW_Gruppe_Anlage_A.pdf'),
    ]

    const grouped = autoGroupBulkImportByFileName(
      files.map((f, index) => ({
        id: `g-${index}`,
        projectName: f.name,
        companyName: undefined as string | undefined,
        files: [f],
      })),
    )

    expect(grouped).toHaveLength(2)
    expect(grouped.find((g) => g.files.length === 2)?.companyName).toBe('SAP SE')
    expect(grouped.find((g) => g.files.length === 1)?.companyName).toBe('BMW Gruppe')
  })

  it('extrahiert Kundenname und Projekttitel aus Referenz-Dateinamen', () => {
    expect(
      extractCompanyNameFromFileName('Referenz_Deutsche_Lufthansa_AG_KI_Platform.pdf'),
    ).toBe('Deutsche Lufthansa AG')
    expect(extractCompanyNameFromFileName('Referenz_SAP_SE_Cloud_Migration.pdf')).toBe(
      'SAP SE',
    )
    expect(
      extractProjectTitleHintFromFileName('Referenz_SAP_SE_Cloud_Migration.pdf'),
    ).toBe('Cloud Migration')
  })

  it('behält bisheriges Verhalten für nicht-generische Präfixe', () => {
    expect(groupingKeyFromFileName('Aurubis_AG_Referenz.pdf')).toBe('aurubis')
  })
})

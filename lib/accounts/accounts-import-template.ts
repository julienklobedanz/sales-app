import * as XLSX from 'xlsx'

import { accountsImportTemplateFilename } from '@/lib/accounts/accounts-import-shared'

const ACCOUNT_HEADERS = ['Name', 'Website', 'Branche', 'Standort', 'Mitarbeiter'] as const

/** Nur Name ist Pflicht — Website, Branche usw. werden beim Import per Brandfetch ergänzt. */
const ACCOUNT_EXAMPLE = ['Beispiel GmbH', '', '', '', ''] as const

function buildImportTemplateWorkbook(): XLSX.WorkBook {
  const headers = [...ACCOUNT_HEADERS]
  const example = [...ACCOUNT_EXAMPLE]

  const sheet = XLSX.utils.aoa_to_sheet([headers, example])
  sheet['!cols'] = headers.map((h) => ({
    wch: h === 'Name' ? 28 : h === 'Website' ? 22 : 16,
  }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Accounts')
  return workbook
}

export function buildAccountsImportTemplateXlsx(): {
  buffer: Buffer
  filename: string
} {
  const workbook = buildImportTemplateWorkbook()
  const filename = accountsImportTemplateFilename()
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return { buffer, filename }
}

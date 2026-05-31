import * as XLSX from 'xlsx'

import type { CompanyEntityKind } from '@/lib/accounts/company-entity'

const ACCOUNT_HEADERS = ['Name', 'Website', 'Branche', 'Standort', 'Mitarbeiter'] as const
const PARTNER_HEADERS = [
  'Name',
  'Website',
  'Branche',
  'Standort',
  'Mitarbeiter',
  'Kategorie',
] as const

/** Nur Name ist Pflicht — Website, Branche usw. werden beim Import per Brandfetch ergänzt. */
const ACCOUNT_EXAMPLE = ['Beispiel GmbH', '', '', '', ''] as const
const PARTNER_EXAMPLE = ['Beispiel Partner AG', '', '', '', '', 'sub'] as const

function buildImportTemplateWorkbook(entityKind: CompanyEntityKind): XLSX.WorkBook {
  const headers = entityKind === 'partner' ? [...PARTNER_HEADERS] : [...ACCOUNT_HEADERS]
  const example = entityKind === 'partner' ? [...PARTNER_EXAMPLE] : [...ACCOUNT_EXAMPLE]

  const sheet = XLSX.utils.aoa_to_sheet([headers, example])
  sheet['!cols'] = headers.map((h) => ({
    wch: h === 'Name' ? 28 : h === 'Website' ? 22 : 16,
  }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    entityKind === 'partner' ? 'Partner' : 'Accounts'
  )
  return workbook
}

export function downloadCompaniesImportTemplate(entityKind: CompanyEntityKind): void {
  const workbook = buildImportTemplateWorkbook(entityKind)
  const filename =
    entityKind === 'partner' ? 'partner-import-vorlage.xlsx' : 'accounts-import-vorlage.xlsx'
  XLSX.writeFile(workbook, filename)
}

export const COMPANIES_IMPORT_ACCEPT =
  '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

export function isCompaniesImportFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return (
    name.endsWith('.csv') ||
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    file.type === 'text/csv' ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel')
  )
}

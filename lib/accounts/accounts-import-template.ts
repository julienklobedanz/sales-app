import * as XLSX from 'xlsx'

import type { AccountEntityKind } from '@/lib/accounts/account-entity'
import { accountsImportTemplateFilename } from '@/lib/accounts/accounts-import-shared'

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

function buildImportTemplateWorkbook(entityKind: AccountEntityKind): XLSX.WorkBook {
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
    entityKind === 'partner' ? 'Partner' : 'Accounts',
  )
  return workbook
}

export function buildAccountsImportTemplateXlsx(entityKind: AccountEntityKind): {
  buffer: Buffer
  filename: string
} {
  const workbook = buildImportTemplateWorkbook(entityKind)
  const filename = accountsImportTemplateFilename(entityKind)
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return { buffer, filename }
}

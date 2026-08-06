import type { AccountEntityKind } from '@/lib/accounts/account-entity'

export const COMPANIES_IMPORT_ACCEPT =
  '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

export function companiesImportTemplateFilename(entityKind: AccountEntityKind): string {
  return entityKind === 'partner'
    ? 'partner-import-vorlage.xlsx'
    : 'accounts-import-vorlage.xlsx'
}

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

/** Template-Download über Server-API (xlsx bleibt serverseitig). */
export async function downloadCompaniesImportTemplate(
  entityKind: AccountEntityKind,
): Promise<void> {
  const res = await fetch(`/api/accounts/import-template?kind=${entityKind}`)
  if (!res.ok) {
    throw new Error('Vorlage konnte nicht geladen werden.')
  }
  const blob = await res.blob()
  const filename =
    parseContentDispositionFilename(res.headers.get('Content-Disposition')) ??
    companiesImportTemplateFilename(entityKind)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null
  const match = /filename="([^"]+)"/i.exec(header)
  return match?.[1] ?? null
}

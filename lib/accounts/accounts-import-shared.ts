export const ACCOUNTS_IMPORT_ACCEPT =
  '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

export function accountsImportTemplateFilename(): string {
  return 'accounts-import-vorlage.xlsx'
}

export function isAccountsImportFile(file: File): boolean {
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
export async function downloadAccountsImportTemplate(): Promise<void> {
  const res = await fetch('/api/accounts/import-template')
  if (!res.ok) {
    throw new Error('Vorlage konnte nicht geladen werden.')
  }
  const blob = await res.blob()
  const filename =
    parseContentDispositionFilename(res.headers.get('Content-Disposition')) ??
    accountsImportTemplateFilename()
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

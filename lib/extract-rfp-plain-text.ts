import 'server-only'

import * as XLSX from 'xlsx'

import {
  extractPlainTextFromFile,
  type ExtractPlainTextResult,
} from '@/lib/extract-document-plain-text'

const MAX_BYTES = 4.5 * 1024 * 1024

function isExcelFile(fileName: string, mimeType: string): boolean {
  return (
    /\.(xlsx?|xls)$/i.test(fileName) ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel')
  )
}

function extractExcelPlainText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const parts: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false, strip: true })
    const trimmed = csv.trim()
    if (trimmed.length > 20) {
      parts.push(`--- ${sheetName} ---\n${trimmed}`)
    }
  }

  return parts.join('\n\n')
}

/**
 * PDF, DOCX oder Excel (XLS/XLSX) → Klartext für Deal-Desk / RFP-Pipeline.
 */
export async function extractRfpPlainTextFromFile(
  file: File,
  options?: { maxChars?: number },
): Promise<ExtractPlainTextResult> {
  const maxChars = options?.maxChars ?? 120_000
  const fileName = file.name ?? 'unbenannt'
  const mimeType = file.type ?? ''

  if (!file?.size) {
    return { success: false, error: 'Keine Datei übergeben.' }
  }
  if (file.size > MAX_BYTES) {
    return {
      success: false,
      error: `Datei zu groß (max. 4,5 MB). Aktuell: ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
    }
  }

  if (isExcelFile(fileName, mimeType)) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const text = extractExcelPlainText(buffer).trim()
      if (text.length < 40) {
        return {
          success: false,
          error:
            'In der Excel-Datei wurde zu wenig lesbarer Inhalt gefunden (leere oder rein formatierte Tabellen).',
          isScanLikely: false,
        }
      }
      return { success: true, text: text.slice(0, maxChars) }
    } catch {
      return {
        success: false,
        error:
          'Excel konnte nicht gelesen werden. Bitte als XLSX speichern oder PDF/Word verwenden.',
      }
    }
  }

  return extractPlainTextFromFile(file, { maxChars })
}

/**
 * PDF-Klartext für Server (KI-Import, RFP). pdf-parse v2 + pdfjs-dist.
 * In Next.js: `serverExternalPackages` für pdf-parse/pdfjs-dist/@napi-rs/canvas setzen.
 */
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

let workerConfigured = false

function ensurePdfWorker(PDFParse: { setWorker: (src?: string) => string }) {
  if (workerConfigured) return
  try {
    const workerPath = join(
      process.cwd(),
      'node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs'
    )
    PDFParse.setWorker(pathToFileURL(workerPath).href)
    workerConfigured = true
  } catch {
    try {
      PDFParse.setWorker()
      workerConfigured = true
    } catch {
      // pdf.js may still run without an explicit worker in some Node builds
    }
  }
}

function textFromParseResult(result: {
  text?: string
  pages?: Array<{ text?: string }>
}): string {
  const direct = typeof result?.text === 'string' ? result.text.trim() : ''
  if (direct.length > 0) return direct
  const fromPages = (result?.pages ?? [])
    .map((p) => String(p?.text ?? '').trim())
    .filter(Boolean)
    .join('\n\n')
  return fromPages
}

export async function extractPdfPlainText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  ensurePdfWorker(PDFParse)

  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return textFromParseResult(result)
  } finally {
    await parser.destroy().catch(() => {})
  }
}

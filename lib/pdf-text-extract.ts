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
      'node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs',
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

export type PdfPlainTextExtraction = {
  text: string
  method: 'native' | 'ocr'
  pageCount?: number
  ocrPagesProcessed?: number
  ocrTruncated?: boolean
}

const MIN_NATIVE_TEXT_CHARS = 40

/**
 * Zuerst eingebetteter PDF-Text; bei Scan-PDF automatisch OpenAI Vision OCR (bis max. 40 Seiten).
 */
export async function extractPdfPlainTextWithOcrFallback(
  buffer: Buffer,
  options?: { maxOcrPages?: number; minNativeChars?: number },
): Promise<PdfPlainTextExtraction> {
  const maxOcrPages = options?.maxOcrPages ?? 40
  const minNativeChars = options?.minNativeChars ?? MIN_NATIVE_TEXT_CHARS

  const native = (await extractPdfPlainText(buffer)).trim()
  if (native.length >= minNativeChars) {
    return { text: native, method: 'native' }
  }

  if (!process.env.OPENAI_API_KEY) {
    return { text: native, method: 'native' }
  }

  const { ocrPdfBufferWithOpenAi } = await import('@/lib/pdf-ocr-openai')
  const ocr = await ocrPdfBufferWithOpenAi(buffer, { maxPages: maxOcrPages })
  const ocrText = ocr.text.trim()

  return {
    text: ocrText.length > 0 ? ocrText : native,
    method: 'ocr',
    pageCount: ocr.totalPages,
    ocrPagesProcessed: ocr.processedPages,
    ocrTruncated: ocr.truncated,
  }
}

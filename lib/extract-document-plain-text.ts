/**
 * Nur Textextraktion (kein LLM) – für API-Routen und RFP-Pipeline.
 * Logik analog zu lib/document-extraction.ts, ohne 'use server'.
 */
import 'server-only'

const MAX_BYTES = 4.5 * 1024 * 1024

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfModule = await import('pdf-parse')
  const fn =
    (pdfModule as unknown as {
      default?: (b: Buffer) => Promise<{ text?: string }>
    }).default ??
    (pdfModule as unknown as (b: Buffer) => Promise<{ text?: string }>)
  const data = await fn(buffer)
  return typeof data?.text === 'string' ? data.text : ''
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await (
    mammoth as unknown as {
      extractRawText: (args: { buffer: Buffer }) => Promise<{ value: string }>
    }
  ).extractRawText({ buffer })
  return typeof result?.value === 'string' ? result.value : ''
}

export type ExtractPlainTextResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

/**
 * PDF oder DOCX → Klartext (Ausschnitt für RFP reicht oft mit Limit).
 */
export async function extractPlainTextFromFile(
  file: File,
  options?: { maxChars?: number }
): Promise<ExtractPlainTextResult> {
  const maxChars = options?.maxChars ?? 120_000
  if (!file?.size) {
    return { ok: false, error: 'Keine Datei übergeben.' }
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Datei zu groß (max. 4,5 MB). Aktuell: ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
    }
  }

  const fileName = file.name ?? 'unbenannt'
  const mimeType = file.type
  const isPdf = mimeType === 'application/pdf' || /\.pdf$/i.test(fileName)
  const isDocx =
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.docx$/i.test(fileName)

  if (!isPdf && !isDocx) {
    return { ok: false, error: 'Nur PDF oder DOCX werden unterstützt.' }
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    let text: string
    if (isPdf) text = await extractTextFromPdf(buffer)
    else text = await extractTextFromDocx(buffer)

    const t = text.trim()
    if (t.length < 40) {
      return {
        ok: false,
        error:
          'Zu wenig erkennbarer Text (evtl. Scan-PDF). Bitte durchsuchbares PDF/DOCX verwenden.',
      }
    }
    return { ok: true, text: t.slice(0, maxChars) }
  } catch {
    return {
      ok: false,
      error: 'Text konnte aus der Datei nicht gelesen werden.',
    }
  }
}

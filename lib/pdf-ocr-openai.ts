/**
 * Scan-PDF-Fallback: Seiten rendern (pdfjs + canvas) → OpenAI Vision transkribiert Text.
 */
import 'server-only'

import { createCanvas } from '@napi-rs/canvas'
import { formatOpenAiHttpError, isOpenAiQuotaError } from '@/lib/openai-api-errors'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const PDF_OCR_MAX_PAGES = 40
const OCR_BATCH_PAGES = 4
const OCR_MODEL = 'gpt-4o-mini'
const RENDER_SCALE = 1.5

let pdfjsWorkerReady = false

async function ensurePdfJsWorker() {
  if (pdfjsWorkerReady) return
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
  const workerPath = join(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
  pdfjsWorkerReady = true
}

export type PdfOcrResult = {
  text: string
  totalPages: number
  processedPages: number
  truncated: boolean
}

async function renderPdfPageImages(
  buffer: Buffer,
  maxPages: number
): Promise<{ images: Buffer[]; totalPages: number; processedPages: number; truncated: boolean }> {
  await ensurePdfJsWorker()
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs')

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    standardFontDataUrl: pathToFileURL(
      join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/')
    ).href,
  }).promise

  try {
    const totalPages = doc.numPages
    const processedPages = Math.min(totalPages, maxPages)
    const truncated = totalPages > maxPages
    const images: Buffer[] = []

    for (let pageNum = 1; pageNum <= processedPages; pageNum++) {
      const page = await doc.getPage(pageNum)
      const viewport = page.getViewport({ scale: RENDER_SCALE })
      const width = Math.max(1, Math.floor(viewport.width))
      const height = Math.max(1, Math.floor(viewport.height))
      const canvas = createCanvas(width, height)
      const ctx = canvas.getContext('2d')

      const renderParams = {
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
        canvas: canvas as unknown as HTMLCanvasElement,
      }

      const task = page.render(renderParams)
      await task.promise

      images.push(canvas.toBuffer('image/png'))
      page.cleanup()
    }

    return { images, totalPages, processedPages, truncated }
  } finally {
    await doc.destroy()
  }
}

async function transcribePageImageBatch(
  images: Buffer[],
  pageStart: number
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY fehlt für Scan-OCR.')
  }

  const pageEnd = pageStart + images.length - 1
  const pageLabel =
    images.length === 1 ? `Seite ${pageStart}` : `Seiten ${pageStart}–${pageEnd}`

  const imageContent = images.map((buf) => ({
    type: 'image_url' as const,
    image_url: {
      url: `data:image/png;base64,${buf.toString('base64')}`,
      detail: 'low' as const,
    },
  }))

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OCR_MODEL,
      temperature: 0,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content:
            'Du transkribierst PDF-Seitenbilder (Deutsch/Englisch) für eine B2B-Ausschreibungsanalyse. Antworte nur mit dem extrahierten Text. Struktur (Überschriften, Listen, Tabellenzeilen) beibehalten. Keine Meta-Kommentare.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extrahiere den vollständigen lesbaren Text aus diesen ${images.length} aufeinanderfolgenden PDF-Seite(n) (${pageLabel}). Trenne jede Seite mit einer eigenen Zeile im Format "--- Seite N ---".`,
            },
            ...imageContent,
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    const err = new Error(formatOpenAiHttpError(response.status, body, 'Scan-OCR'))
    if (isOpenAiQuotaError(response.status, body)) {
      ;(err as Error & { code?: string }).code = 'openai_quota'
    }
    throw err
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json.choices?.[0]?.message?.content
  return typeof content === 'string' ? content.trim() : ''
}

/**
 * OCR für Scan-PDFs über OpenAI Vision (max. `maxPages` Seiten, Standard 40).
 */
export async function ocrPdfBufferWithOpenAi(
  buffer: Buffer,
  options?: { maxPages?: number }
): Promise<PdfOcrResult> {
  const maxPages = options?.maxPages ?? PDF_OCR_MAX_PAGES
  const { images, totalPages, processedPages, truncated } = await renderPdfPageImages(
    buffer,
    maxPages
  )

  if (images.length === 0) {
    return { text: '', totalPages, processedPages: 0, truncated }
  }

  const parts: string[] = []

  for (let i = 0; i < images.length; i += OCR_BATCH_PAGES) {
    const batch = images.slice(i, i + OCR_BATCH_PAGES)
    const pageStart = i + 1
    const chunk = await transcribePageImageBatch(batch, pageStart)
    if (chunk.length > 0) parts.push(chunk)
  }

  let text = parts.join('\n\n').trim()
  if (truncated) {
    text += `\n\n[Hinweis: PDF hat ${totalPages} Seiten; OCR nur für die ersten ${processedPages} Seiten.]`
  }

  return { text, totalPages, processedPages, truncated }
}

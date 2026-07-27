/**
 * Bild-OCR (PNG/JPEG/WebP) über OpenAI Vision — für Magic Import von Referenz-Slides.
 */
import 'server-only'

import { formatOpenAiHttpError, isOpenAiQuotaError } from '@/lib/openai-api-errors'

const OCR_MODEL = 'gpt-4o-mini'

const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])

export function isSupportedReferenceImageMime(
  mimeType: string | null | undefined,
  fileName?: string
): boolean {
  const mt = String(mimeType ?? '').toLowerCase()
  if (IMAGE_MIME.has(mt)) return true
  return /\.(png|jpe?g|webp)$/i.test(fileName ?? '')
}

export function resolveImageMimeType(
  mimeType: string | null | undefined,
  fileName?: string
): 'image/png' | 'image/jpeg' | 'image/webp' {
  const mt = String(mimeType ?? '').toLowerCase()
  if (mt === 'image/png' || mt === 'image/webp' || mt === 'image/jpeg') return mt
  if (mt === 'image/jpg') return 'image/jpeg'
  if (/\.png$/i.test(fileName ?? '')) return 'image/png'
  if (/\.webp$/i.test(fileName ?? '')) return 'image/webp'
  return 'image/jpeg'
}

/**
 * Transkribiert ein Referenz-Bild (Slide/One-Pager) zu Klartext für die Feld-Extraktion.
 */
export async function ocrImageBufferWithOpenAi(
  buffer: Buffer,
  options?: { mimeType?: string | null; fileName?: string }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'Automatisches Ausfüllen von Bildern ist nicht konfiguriert (fehlender API-Schlüssel). Bitte als PDF exportieren oder Felder manuell ausfüllen.'
    )
  }

  const mime = resolveImageMimeType(options?.mimeType, options?.fileName)
  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`

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
            'Du transkribierst Referenz-/Case-Study-Bilder (Deutsch/Englisch) für ein B2B-Sales-Tool. Antworte nur mit dem lesbaren Text. Behalte Zahlen, Preise, Laufzeiten, Wettbewerber und Tabellenzeilen bei. Keine Meta-Kommentare.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extrahiere den vollständigen lesbaren Text aus diesem Referenz-Slide/Bild. Struktur (Überschriften, Kennzahlen, Preisvergleiche) beibehalten.',
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl, detail: 'high' as const },
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    const err = new Error(formatOpenAiHttpError(response.status, body, 'Bild-OCR'))
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

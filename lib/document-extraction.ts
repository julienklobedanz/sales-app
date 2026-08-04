import type {
  ExtractedReferenceData,
  ExtractDataFromDocumentResult,
} from '@/lib/references/extract-types'
import { MASTER_INDUSTRIES, resolveIndustryId } from '@/lib/constants/industries'
import { parseReferenceHeuristicsFromText } from '@/lib/references/heuristic-reference-extract'
import { clampNarrativeTextNullable } from '@/lib/references/reference-narrative-limits'
import {
  isSupportedReferenceImageMime,
  ocrImageBufferWithOpenAi,
} from '@/lib/image-ocr-openai'
import { log } from '@/lib/observability/logger'

const INDUSTRY_IDS_LIST = MASTER_INDUSTRIES.map((item) => item.id).join(', ')

function parseIsoDateOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  const d = new Date(`${t}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : t
}

function parsePositiveIntOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value)
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number.parseInt(value.trim(), 10)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

async function extractWithLLM(documentText: string): Promise<ExtractedReferenceData> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'Automatisches Ausfüllen ist nicht konfiguriert (fehlender API-Schlüssel). Bitte die Felder manuell ausfüllen oder einen Administrator informieren.',
    )
  }

  const prompt = `Extrahiere aus dem folgenden Referenzdokument-Text strukturierte Daten. Antworte NUR mit einem gültigen JSON-Objekt, ohne zusätzlichen Text.

Erlaubte Werte für "industry" (genau EINE dieser IDs, exakt so geschrieben): ${INDUSTRY_IDS_LIST}

JSON-Schema:
{
  "title": "string oder null",
  "summary": "sehr kurze Zusammenfassung (max. 2 Sätze) oder null",
  "industry": "genau eine der erlaubten ID-Strings oder null — KEIN Freitext, KEINE Langlabels",
  "volume_eur": "Gesamtvolumen als string z.B. '290413' oder '5M' oder null — bevorzuge Gesamtvertragswert vor MRR/ARR",
  "employee_count": Zahl oder null,
  "tags": ["tag1", "tag2"],
  "company_name": "Kundenname / Auftraggeber aus dem Dokument oder null — NICHT der Anbieter/eigene Firma, wenn unterscheidbar",
  "customer_challenge": "Herausforderung des Kunden (sehr kurz, 1 Satz) oder null",
  "our_solution": "Unsere Lösung / angebotene Lösung (sehr kurz, 1 Satz) oder null",
  "duration_months": "Laufzeit in Monaten als Zahl oder null (z.B. 42)",
  "project_start": "ISO-Datum YYYY-MM-DD oder null",
  "project_end": "ISO-Datum YYYY-MM-DD oder null",
  "incumbent_provider": "Bestandsdienstleister / bisheriger Anbieter (Name, optional Preis in Klammern) oder null",
  "competitors": "Wettbewerber komma-getrennt (Namen, optional Preis/Hinweis in Klammern) oder null",
  "contract_type": "Vertrags-/Leistungsart kurz (z.B. Managed Services) oder null"
}

Regeln:
- Schreibe alle Textfelder so knapp wie möglich. Keine Zeilenumbrüche in Strings.
- Wenn nur eine Laufzeit bekannt ist (z.B. „42 Monate“) und ein Jahr genannt wird, setze project_end auf YYYY-12-31 dieses Jahres und project_start = Ende minus Laufzeit.
- Wenn Laufzeit und Start ODER Ende bekannt sind, ergänze das fehlende Datum.
- incumbent_provider / competitors: Namen beibehalten; Preisvergleiche kurz in Klammern erlauben.

Dokumenttext (Ausschnitt):
---
      ${documentText.slice(0, 20000)}
---`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            'Du extrahierst aus deutschen Consulting-Case-Studies und Win-Slides kompakte, strukturierte Referenzdaten für ein Sales-Tool. Antworte immer nur mit gültigem JSON. Für "industry" gib ausschließlich eine der vorgegebenen ID-Strings zurück (fin, ret, man, tech, media, energy, health, pub, log, cons, prop, other) — niemals Branchennamen oder Freitext.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 900,
    }),
  })

  if (!response.ok) {
    const bodyText = await response.text()
    const lower = bodyText.toLowerCase()
    if (
      response.status === 429 ||
      lower.includes('insufficient_quota') ||
      lower.includes('rate_limit') ||
      lower.includes('billing')
    ) {
      throw new Error(
        'Automatisches Ausfüllen ist gerade nicht möglich: beim KI-Anbieter ist das Kontingent aufgebraucht oder ein Rate-Limit greift. Bitte Abrechnung/API-Plan prüfen oder die Felder manuell ausfüllen.',
      )
    }
    if (response.status === 401) {
      throw new Error(
        'Automatisches Ausfüllen ist nicht möglich: der API-Schlüssel für die KI-Extraktion ist ungültig. Bitte die Konfiguration prüfen.',
      )
    }
    if (response.status === 503 || response.status === 502) {
      throw new Error(
        'Der KI-Dienst ist vorübergehend nicht erreichbar. Bitte später erneut versuchen oder die Felder manuell ausfüllen.',
      )
    }
    throw new Error(
      'Die KI-Antwort konnte nicht verarbeitet werden. Bitte später erneut versuchen oder die Felder manuell ausfüllen.',
    )
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Keine Antwort von der API.')

  const parsed = JSON.parse(content) as ExtractedReferenceData
  return {
    title: typeof parsed.title === 'string' ? parsed.title : null,
    summary:
      typeof parsed.summary === 'string'
        ? clampNarrativeTextNullable(parsed.summary)
        : null,
    industry: (() => {
      if (typeof parsed.industry !== 'string') return null
      const id = resolveIndustryId(parsed.industry.trim())
      return id || null
    })(),
    volume_eur: typeof parsed.volume_eur === 'string' ? parsed.volume_eur : null,
    employee_count:
      typeof parsed.employee_count === 'number' ? parsed.employee_count : null,
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.filter((t): t is string => typeof t === 'string')
      : [],
    company_name: typeof parsed.company_name === 'string' ? parsed.company_name : null,
    customer_challenge:
      typeof parsed.customer_challenge === 'string'
        ? clampNarrativeTextNullable(parsed.customer_challenge)
        : null,
    our_solution:
      typeof parsed.our_solution === 'string'
        ? clampNarrativeTextNullable(parsed.our_solution)
        : null,
    duration_months: parsePositiveIntOrNull(parsed.duration_months),
    project_start: parseIsoDateOrNull(parsed.project_start),
    project_end: parseIsoDateOrNull(parsed.project_end),
    incumbent_provider:
      typeof parsed.incumbent_provider === 'string' && parsed.incumbent_provider.trim()
        ? parsed.incumbent_provider.trim()
        : null,
    competitors:
      typeof parsed.competitors === 'string' && parsed.competitors.trim()
        ? parsed.competitors.trim()
        : null,
    contract_type:
      typeof parsed.contract_type === 'string' && parsed.contract_type.trim()
        ? parsed.contract_type.trim()
        : null,
  }
}

const MAX_FILE_BYTES = 4.5 * 1024 * 1024 // 4.5MB

export type ExtractFromBufferOptions = {
  /** Bei LLM-Fehler/Quota: Heuristik aus Klartext (kein OpenAI). */
  allowHeuristicFallback?: boolean
  pdfTitle?: string | null
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { extractPdfPlainTextWithOcrFallback } = await import('@/lib/pdf-text-extract')
  const result = await extractPdfPlainTextWithOcrFallback(buffer, { maxOcrPages: 40 })
  return result.text
}

function mapDocumentExtractError(
  err: Error,
  format: 'pdf' | 'pptx' | 'docx' | 'doc' | 'image',
): string {
  const msg = err.message || ''
  if (err.message === 'DOCX_EXTRACT_FAILED') {
    return 'Text konnte nicht aus der Word-Datei gelesen werden. Bitte als PDF oder PowerPoint exportieren und erneut versuchen.'
  }
  if (err.message === 'DOC_FORMAT_UNSUPPORTED') {
    return 'Ältere Word-Dateien (.doc) werden nicht unterstützt. Bitte als DOCX, PDF oder PowerPoint speichern und erneut hochladen.'
  }
  if (/password|passwort|encrypted|verschlüsselt/i.test(msg)) {
    return 'PDF ist passwortgeschützt oder verschlüsselt. Bitte ohne Kennwort exportieren oder die Felder manuell ausfüllen.'
  }
  if (/invalid pdf|invalidpdf|not a pdf|pdf header/i.test(msg)) {
    return 'Die PDF-Datei ist beschädigt oder kein gültiges PDF. Bitte erneut exportieren oder die Felder manuell ausfüllen.'
  }
  if (process.env.NODE_ENV === 'development' && msg) {
    log.error('parse failed', { action: 'document-extraction.parse', format }, err)
  }
  if (format === 'image') {
    return (
      msg ||
      'Bild-Text konnte nicht gelesen werden. Bitte erneut versuchen, als PDF exportieren oder die Felder manuell ausfüllen.'
    )
  }
  if (format === 'pdf') {
    return 'PDF-Text konnte nicht gelesen werden. Bitte erneut hochladen oder die Felder manuell ausfüllen.'
  }
  return 'Text konnte nicht aus dem Dokument gelesen werden. Bitte die Felder manuell ausfüllen.'
}

/** Extrahiert Text aus PPTX (ZIP mit ppt/slides/slideN.xml; Text in <a:t>-Elementen). */
async function extractTextFromPptx(buffer: Buffer): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)
  const slideFiles = Object.keys(zip.files).filter((n) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(n),
  )
  const texts: string[] = []
  for (const name of slideFiles.sort()) {
    const file = zip.files[name]
    if (!file || file.dir) continue
    const xml = await file.async('string')
    const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g)
    if (matches)
      texts.push(
        matches
          .map((m) => m.replace(/<\/?a:t>/g, '').trim())
          .filter(Boolean)
          .join(' '),
      )
  }
  return texts.join('\n\n')
}

/** Extrahiert Text aus DOCX mit mammoth. */
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    // mammoth erwartet ein Objekt mit Buffer-Eigenschaft
    const mammoth = await import('mammoth')
    const result = await (
      mammoth as unknown as {
        extractRawText: (args: { buffer: Buffer }) => Promise<{ value: string }>
      }
    ).extractRawText({ buffer })
    return typeof result?.value === 'string' ? result.value : ''
  } catch (e) {
    log.error(
      'extractTextFromDocx failed',
      { action: 'document-extraction.extractTextFromDocx' },
      e,
    )
    throw new Error('DOCX_EXTRACT_FAILED')
  }
}

/** Nur Klartext — für Bulk-Import-Vorschau und Heuristik. */
export async function extractPlainTextFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string | null,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const name = fileName || 'unbenannt'
  const size = buffer.length
  if (size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `Datei zu groß (max. 4,5 MB). Aktuell: ${(size / 1024 / 1024).toFixed(1)} MB.`,
    }
  }

  const mt = String(mimeType ?? '')
  const isPdf = mt === 'application/pdf' || /\.pdf$/i.test(name)
  const isPptx =
    mt === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    /\.pptx$/i.test(name)
  const isDocx =
    mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.docx$/i.test(name)
  const isDoc = mt === 'application/msword' || /\.doc$/i.test(name)
  const isImage = isSupportedReferenceImageMime(mt, name)

  if (!isPdf && !isPptx && !isDocx && !isDoc && !isImage) {
    return {
      ok: false,
      error:
        'Nur Word-, PowerPoint-, PDF- oder Bild-Dateien (PNG/JPEG/WebP) werden unterstützt.',
    }
  }

  const format: 'pdf' | 'pptx' | 'docx' | 'doc' | 'image' = isPdf
    ? 'pdf'
    : isPptx
      ? 'pptx'
      : isDocx
        ? 'docx'
        : isImage
          ? 'image'
          : 'doc'

  try {
    let documentText: string
    if (isPdf) documentText = await extractTextFromPdf(buffer)
    else if (isPptx) documentText = await extractTextFromPptx(buffer)
    else if (isDocx) documentText = await extractTextFromDocx(buffer)
    else if (isImage) {
      documentText = await ocrImageBufferWithOpenAi(buffer, {
        mimeType: mt,
        fileName: name,
      })
    } else throw new Error('DOC_FORMAT_UNSUPPORTED')
    if (!documentText?.trim() || documentText.trim().length < 50) {
      return {
        ok: false,
        error:
          'Zu wenig erkennbarer Text (evtl. Scan/Bildqualität). Bitte Felder manuell ausfüllen.',
      }
    }
    return { ok: true, text: documentText }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    return { ok: false, error: mapDocumentExtractError(err, format) }
  }
}

/**
 * Extraktion aus Buffer (z. B. Bulk-Import aus Storage) – gleiche Limits/Formate wie Upload-Formular.
 */
export async function extractDataFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string | null,
  options?: ExtractFromBufferOptions,
): Promise<ExtractDataFromDocumentResult> {
  const plain = await extractPlainTextFromBuffer(buffer, fileName, mimeType)
  if (!plain.ok) return { success: false, error: plain.error }

  const documentText = plain.text
  const heuristicData = parseReferenceHeuristicsFromText(documentText, {
    fileName,
    pdfTitle: options?.pdfTitle ?? null,
  })

  const mergeHeuristic = (data: ExtractedReferenceData): ExtractedReferenceData => ({
    title: data.title?.trim() || heuristicData.title,
    summary: data.summary?.trim() || heuristicData.summary,
    industry: data.industry?.trim() || heuristicData.industry,
    volume_eur: data.volume_eur?.trim() || heuristicData.volume_eur,
    employee_count: data.employee_count ?? heuristicData.employee_count,
    tags: data.tags?.length ? data.tags : heuristicData.tags,
    company_name: data.company_name?.trim() || heuristicData.company_name,
    customer_challenge:
      data.customer_challenge?.trim() || heuristicData.customer_challenge,
    our_solution: data.our_solution?.trim() || heuristicData.our_solution,
    duration_months: data.duration_months ?? heuristicData.duration_months,
    project_start: data.project_start ?? heuristicData.project_start,
    project_end: data.project_end ?? heuristicData.project_end,
    incumbent_provider:
      data.incumbent_provider?.trim() || heuristicData.incumbent_provider,
    competitors: data.competitors?.trim() || heuristicData.competitors,
    contract_type: data.contract_type?.trim() || heuristicData.contract_type,
  })

  try {
    const data = await extractWithLLM(documentText)
    if (options?.allowHeuristicFallback) {
      return { success: true, data: mergeHeuristic(data) }
    }
    return { success: true, data }
  } catch (e) {
    if (options?.allowHeuristicFallback) {
      return { success: true, data: heuristicData }
    }
    const err = e instanceof Error ? e : new Error(String(e))
    return { success: false, error: err.message || 'Extraktion fehlgeschlagen.' }
  }
}

export async function extractDataFromDocument(
  formData: FormData,
): Promise<ExtractDataFromDocumentResult> {
  try {
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File)) {
      return { success: false, error: 'Keine Datei übergeben.' }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    return extractDataFromBuffer(buffer, file.name ?? 'unbenannt', file.type)
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    return {
      success: false,
      error:
        err.message ||
        'Ein unerwarteter Fehler ist aufgetreten. Bitte Dateigröße (max. 4,5 MB) und Format prüfen.',
    }
  }
}

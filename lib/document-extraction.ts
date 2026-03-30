'use server'

import type {
  ExtractedReferenceData,
  ExtractDataFromDocumentResult,
} from '@/app/dashboard/evidence/new/types'

const INDUSTRIES_LIST =
  'Financial Services & Insurance, Retail & Consumer Goods (CPG), Manufacturing & Automotive, Technology, Media & Telecom (TMT), Energy, Resources & Utilities, Healthcare & Life Sciences, Public Sector & Education, Professional Services & Logistics, Travel, Transport & Hospitality, Sonstige'

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

/** Extrahiert Text aus PPTX (ZIP mit ppt/slides/slideN.xml; Text in <a:t>-Elementen). */
async function extractTextFromPptx(buffer: Buffer): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)
  const slideFiles = Object.keys(zip.files).filter((n) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(n)
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
          .join(' ')
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
    console.error('extractTextFromDocx: error', e)
    throw new Error('DOCX_EXTRACT_FAILED')
  }
}

async function extractWithLLM(documentText: string): Promise<ExtractedReferenceData> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ist nicht gesetzt.')
  }

  const prompt = `Extrahiere aus dem folgenden Referenzdokument-Text strukturierte Daten. Antworte NUR mit einem gültigen JSON-Objekt, ohne zusätzlichen Text.

Erlaubte Werte für "industry" (genau einer): ${INDUSTRIES_LIST}

JSON-Schema:
{
  "title": "string oder null",
  "summary": "sehr kurze Zusammenfassung (max. 2 Sätze) oder null",
  "industry": "einer der erlaubten Industrien oder null",
  "volume_eur": "string z.B. '5M' oder '500000' oder null",
  "employee_count": Zahl oder null,
  "tags": ["tag1", "tag2"],
  "company_name": "Firmenname / Kundenname aus dem Dokument oder null",
  "customer_challenge": "Herausforderung des Kunden (sehr kurz, 1 Satz) oder null",
  "our_solution": "Unsere Lösung / angebotene Lösung (sehr kurz, 1 Satz) oder null"
}

Schreibe alle Textfelder so knapp wie möglich. Verwende KEINE Zeilenumbrüche in Strings.

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
            'Du extrahierst aus deutschen Consulting-Case-Studies kompakte, strukturierte Referenzdaten für ein Sales-Tool. Antworte immer nur mit gültigem JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 600,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API: ${response.status} ${err}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Keine Antwort von der API.')

  const parsed = JSON.parse(content) as ExtractedReferenceData
  return {
    title: typeof parsed.title === 'string' ? parsed.title : null,
    summary: typeof parsed.summary === 'string' ? parsed.summary : null,
    industry: typeof parsed.industry === 'string' ? parsed.industry : null,
    volume_eur: typeof parsed.volume_eur === 'string' ? parsed.volume_eur : null,
    employee_count:
      typeof parsed.employee_count === 'number' ? parsed.employee_count : null,
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.filter((t): t is string => typeof t === 'string')
      : [],
    company_name:
      typeof parsed.company_name === 'string' ? parsed.company_name : null,
    customer_challenge:
      typeof parsed.customer_challenge === 'string'
        ? parsed.customer_challenge
        : null,
    our_solution:
      typeof parsed.our_solution === 'string' ? parsed.our_solution : null,
  }
}

const MAX_FILE_BYTES = 4.5 * 1024 * 1024 // 4.5MB

export async function extractDataFromDocument(
  formData: FormData
): Promise<ExtractDataFromDocumentResult> {
  try {
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File)) {
      return { success: false, error: 'Keine Datei übergeben.' }
    }

    const mimeType = file.type
    const fileName = file.name ?? 'unbenannt'
    const size = file.size

    if (size > MAX_FILE_BYTES) {
      return {
        success: false,
        error: `Datei zu groß für automatische Erkennung (Max 4,5 MB). Aktuell: ${(size / 1024 / 1024).toFixed(1)} MB.`,
      }
    }

    const isPdf = mimeType === 'application/pdf' || /\.pdf$/i.test(fileName)
    const isPptx =
      mimeType ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      /\.pptx$/i.test(fileName)
    const isDocx =
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.docx$/i.test(fileName)
    const isDoc = mimeType === 'application/msword' || /\.doc$/i.test(fileName)

    if (!isPdf && !isPptx && !isDocx && !isDoc) {
      return {
        success: false,
        error: 'Nur Word-, PowerPoint- oder PDF-Dateien werden unterstützt.',
      }
    }

    let documentText: string
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      if (isPdf) documentText = await extractTextFromPdf(buffer)
      else if (isPptx) documentText = await extractTextFromPptx(buffer)
      else if (isDocx) documentText = await extractTextFromDocx(buffer)
      else if (isDoc) throw new Error('DOC_FORMAT_UNSUPPORTED')
      else throw new Error('UNSUPPORTED_FORMAT')
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      if (err.message === 'DOCX_EXTRACT_FAILED') {
        return {
          success: false,
          error:
            'Text konnte nicht aus der Word-Datei gelesen werden. Bitte als PDF oder PowerPoint exportieren und erneut versuchen.',
        }
      }
      if (err.message === 'DOC_FORMAT_UNSUPPORTED') {
        return {
          success: false,
          error:
            'Ältere Word-Dateien (.doc) werden nicht unterstützt. Bitte als DOCX, PDF oder PowerPoint speichern und erneut hochladen.',
        }
      }
      return {
        success: false,
        error:
          'Text konnte nicht aus dem Dokument gelesen werden. Das Dokument könnte bildbasiert oder geschützt sein – bitte die Felder manuell ausfüllen.',
      }
    }

    if (!documentText || documentText.trim().length < 50) {
      return {
        success: false,
        error:
          'Das Dokument enthält zu wenig erkennbaren Text für eine Extraktion (möglicherweise ein Scan/Bild-PDF). Bitte die Felder manuell ausfüllen.',
      }
    }

    try {
      const data = await extractWithLLM(documentText)
      return { success: true, data }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      return { success: false, error: err.message || 'Extraktion fehlgeschlagen.' }
    }
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


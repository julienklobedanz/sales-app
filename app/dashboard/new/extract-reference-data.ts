'use server'

export type ExtractedReferenceData = {
  title: string | null
  summary: string | null
  industry: string | null
  volume_eur: string | null
  employee_count: number | null
  tags: string[]
}

export type ExtractDataFromDocumentResult =
  | { success: true; data: ExtractedReferenceData }
  | { success: false; error: string }

const INDUSTRIES_LIST =
  'IT & Software, Finanzdienstleistungen, Gesundheitswesen, Industrie & Produktion, Handel, Öffentlicher Sektor, Sonstige'

const ACCEPTED_TYPES = {
  'application/pdf': true,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': true, // .pptx
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfModule = await import('pdf-parse')
  const fn = (pdfModule as unknown as { default?: (b: Buffer) => Promise<{ text?: string }> }).default ?? (pdfModule as unknown as (b: Buffer) => Promise<{ text?: string }>)
  const data = await fn(buffer)
  return typeof data?.text === 'string' ? data.text : ''
}

/** Extrahiert Text aus PPTX (ZIP mit ppt/slides/slideN.xml; Text in <a:t>-Elementen). */
async function extractTextFromPptx(buffer: Buffer): Promise<string> {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buffer)
  const slideFiles = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
  const texts: string[] = []
  for (const name of slideFiles.sort()) {
    const file = zip.files[name]
    if (!file || file.dir) continue
    const xml = await file.async('string')
    const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g)
    if (matches) texts.push(matches.map((m) => m.replace(/<\/?a:t>/g, '').trim()).filter(Boolean).join(' '))
  }
  return texts.join('\n\n')
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
  "summary": "string oder null",
  "industry": "einer der erlaubten Industrien oder null",
  "volume_eur": "string z.B. '5M' oder '500000' oder null",
  "employee_count": Zahl oder null,
  "tags": ["tag1", "tag2"]
}

Dokumenttext:
---
${documentText.slice(0, 12000)}
---`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
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
    employee_count: typeof parsed.employee_count === 'number' ? parsed.employee_count : null,
    tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === 'string') : [],
  }
}

export async function extractDataFromDocument(formData: FormData): Promise<ExtractDataFromDocumentResult> {
  const file = formData.get('file') as File | null
  if (!file || !(file instanceof File)) {
    return { success: false, error: 'Keine Datei übergeben.' }
  }

  const type = file.type as keyof typeof ACCEPTED_TYPES
  if (!ACCEPTED_TYPES[type]) {
    return { success: false, error: 'Nur PDF- oder PPTX-Dateien werden unterstützt.' }
  }

  let documentText: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    if (type === 'application/pdf') {
      documentText = await extractTextFromPdf(buffer)
    } else {
      documentText = await extractTextFromPptx(buffer)
    }
  } catch (e) {
    console.error('Text extraction error:', e)
    return { success: false, error: 'Text konnte nicht aus dem Dokument gelesen werden.' }
  }

  if (!documentText || documentText.trim().length < 50) {
    return { success: false, error: 'Das Dokument enthält zu wenig Text für eine Extraktion.' }
  }

  try {
    const data = await extractWithLLM(documentText)
    return { success: true, data }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Extraktion fehlgeschlagen.'
    return { success: false, error: message }
  }
}

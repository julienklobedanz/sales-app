import PptxGenJS from 'pptxgenjs'

export type ReferenceOnepagerPptxInput = {
  title: string
  companyName: string
  status: string
  summary: string | null
  industry: string | null
  country: string | null
  customerChallenge: string | null
  ourSolution: string | null
  volumeEur: string | null
  contractType: string | null
  projectStart: string | null
  projectEnd: string | null
  tags: string | null
  orgName: string
  legalLine: string
}

function clip(text: string | null | undefined, maxChars: number): string {
  const t = String(text ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!t) return '—'
  return t.length <= maxChars ? t : `${t.slice(0, maxChars - 1)}…`
}

function statusLegalLineDe(status: string): string {
  const s = String(status ?? '').toLowerCase()
  if (s === 'approved') return 'Freigabe: öffentlich / Named Reference – externe Nutzung gemäß Policy erlaubt.'
  if (s === 'anonymized') return 'Freigabe: nur anonym – keine Namen/Logos nach außen.'
  if (s === 'internal_only' || s === 'internal') return 'Nur intern – nicht für Kunden oder Externe.'
  return `Status: ${status} – Nutzung intern prüfen.`
}

export function buildLegalLineForReference(status: string): string {
  return statusLegalLineDe(status)
}

export async function buildReferenceOnepagerPptxBuffer(input: ReferenceOnepagerPptxInput): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  pptx.author = input.orgName
  pptx.company = input.orgName
  pptx.subject = 'Referenz One-Pager'

  const slide = pptx.addSlide({ sectionTitle: 'One-Pager' })

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.12, fill: { color: '2563EB' } })

  slide.addText(clip(input.title, 140), {
    x: 0.4,
    y: 0.28,
    w: 9.2,
    h: 0.75,
    fontSize: 20,
    bold: true,
    color: '0F172A',
    fontFace: 'Arial',
  })

  slide.addText(
    [input.companyName, input.industry, input.country].filter(Boolean).join(' · ') || '—',
    {
      x: 0.4,
      y: 0.98,
      w: 9.2,
      h: 0.35,
      fontSize: 11,
      color: '475569',
      fontFace: 'Arial',
    }
  )

  slide.addText(clip(input.legalLine, 220), {
    x: 0.4,
    y: 1.32,
    w: 9.2,
    h: 0.45,
    fontSize: 9,
    color: '64748B',
    italic: true,
    fontFace: 'Arial',
  })

  slide.addText('Überblick', {
    x: 0.4,
    y: 1.85,
    w: 4.35,
    h: 0.28,
    fontSize: 11,
    bold: true,
    color: '1D4ED8',
    fontFace: 'Arial',
  })
  slide.addText(clip(input.summary, 720), {
    x: 0.4,
    y: 2.12,
    w: 4.35,
    h: 2.35,
    fontSize: 10,
    color: '334155',
    valign: 'top',
    wrap: true,
    fontFace: 'Arial',
  })

  slide.addText('Herausforderung', {
    x: 0.4,
    y: 4.55,
    w: 4.35,
    h: 0.28,
    fontSize: 11,
    bold: true,
    color: '1D4ED8',
    fontFace: 'Arial',
  })
  slide.addText(clip(input.customerChallenge, 420), {
    x: 0.4,
    y: 4.82,
    w: 4.35,
    h: 1.05,
    fontSize: 10,
    color: '334155',
    valign: 'top',
    wrap: true,
    fontFace: 'Arial',
  })

  slide.addText('Lösung & Nutzen', {
    x: 5.0,
    y: 1.85,
    w: 4.55,
    h: 0.28,
    fontSize: 11,
    bold: true,
    color: '1D4ED8',
    fontFace: 'Arial',
  })
  slide.addText(clip(input.ourSolution, 720), {
    x: 5.0,
    y: 2.12,
    w: 4.55,
    h: 2.35,
    fontSize: 10,
    color: '334155',
    valign: 'top',
    wrap: true,
    fontFace: 'Arial',
  })

  const metrics = [
    input.volumeEur ? `Volumen: ${input.volumeEur}` : null,
    input.contractType ? `Modell: ${input.contractType}` : null,
    input.projectStart ? `Start: ${input.projectStart}` : null,
    input.projectEnd ? `Ende: ${input.projectEnd}` : null,
    input.tags ? `Tags: ${clip(input.tags, 100)}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  slide.addText('Kennzahlen & Rahmen', {
    x: 5.0,
    y: 4.55,
    w: 4.55,
    h: 0.28,
    fontSize: 11,
    bold: true,
    color: '1D4ED8',
    fontFace: 'Arial',
  })
  slide.addText(metrics || '—', {
    x: 5.0,
    y: 4.82,
    w: 4.55,
    h: 1.05,
    fontSize: 10,
    color: '334155',
    valign: 'top',
    wrap: true,
    fontFace: 'Arial',
  })

  slide.addText(
    `Erstellt mit RefStack · ${input.orgName} · ${new Date().toLocaleDateString('de-DE')} · Nur gemäß Freigabestatus verwenden.`,
    {
      x: 0.4,
      y: 5.85,
      w: 9.2,
      h: 0.35,
      fontSize: 8,
      color: '94A3B8',
      fontFace: 'Arial',
    }
  )

  const out = await pptx.write({ outputType: 'nodebuffer' })
  return out as Buffer
}

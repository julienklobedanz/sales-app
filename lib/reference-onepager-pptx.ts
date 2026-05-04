import PptxGenJS from 'pptxgenjs'

/** PptxGenJS LAYOUT_16x9 — alle Y/H-Werte in Zoll, damit nichts unter 5.625" ragt */
const SLIDE_H_IN = 5.625

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

/** Bento-/Editor-Zeilenumbrüche zusammenführen; Bullet-Zeilen bleiben eigene Zeilen, Fortsetzungen an den vorherigen Block hängen */
function normalizePptxFlowText(value: string | null | undefined): string {
  if (value == null || !String(value).trim()) return ''
  const lines = String(value)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return ''
  const isBullet = (t: string) => /^[•\u2022]|\*\s|^\d+\.\s/.test(t)
  const out: string[] = []
  for (const t of lines) {
    if (isBullet(t)) {
      out.push(t)
    } else if (out.length === 0) {
      out.push(t)
    } else {
      out[out.length - 1] = `${out[out.length - 1]} ${t}`
    }
  }
  return out.join('\n')
}

function clipNormalized(text: string | null | undefined, maxChars: number): string {
  return clip(normalizePptxFlowText(text), maxChars)
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

  const EDGE = 0.4
  const TOP_BAR_H = 0.1
  const FOOTER_H = 0.28
  const FOOTER_BOTTOM_MARGIN = 0.12
  const GAP_ABOVE_FOOTER = 0.1
  /** Unterkante Fließtext oberhalb des Footers */
  const contentBottomY = SLIDE_H_IN - FOOTER_BOTTOM_MARGIN - FOOTER_H - GAP_ABOVE_FOOTER

  const FOOTER_Y = SLIDE_H_IN - FOOTER_BOTTOM_MARGIN - FOOTER_H

  const LEFT = { x: EDGE, w: 4.35 }
  const RIGHT = { x: 5.0, w: 4.55 }
  const FULL_W = 10 - EDGE * 2

  const SECTION_LABEL_H = 0.22
  const GAP_AFTER_LEGAL = 0.08
  const GAP_MIDDLE_TO_BOTTOM = 0.08

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: TOP_BAR_H, fill: { color: '2563EB' } })

  let y = TOP_BAR_H + 0.04

  slide.addText(clipNormalized(input.title, 140), {
    x: EDGE,
    y,
    w: FULL_W,
    h: 0.48,
    fontSize: 20,
    bold: true,
    color: '0F172A',
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  })
  y += 0.5

  slide.addText(
    clipNormalized([input.companyName, input.industry, input.country].filter(Boolean).join(' · ') || '—', 200),
    {
      x: EDGE,
      y,
      w: FULL_W,
      h: 0.2,
      fontSize: 11,
      color: '475569',
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    }
  )
  y += 0.22

  slide.addText(clip(input.legalLine, 220), {
    x: EDGE,
    y,
    w: FULL_W,
    h: 0.24,
    fontSize: 9,
    color: '64748B',
    italic: true,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  })
  y += 0.26 + GAP_AFTER_LEGAL

  const row1LabelY = y
  slide.addText('Überblick', {
    x: LEFT.x,
    y: row1LabelY,
    w: LEFT.w,
    h: SECTION_LABEL_H,
    fontSize: 11,
    bold: true,
    color: '1D4ED8',
    fontFace: 'Arial',
    valign: 'top',
  })
  slide.addText('Lösung & Nutzen', {
    x: RIGHT.x,
    y: row1LabelY,
    w: RIGHT.w,
    h: SECTION_LABEL_H,
    fontSize: 11,
    bold: true,
    color: '1D4ED8',
    fontFace: 'Arial',
    valign: 'top',
  })

  const row1BodyY = row1LabelY + SECTION_LABEL_H + 0.02

  /** Unterer Block: Label + Lücke + Fläche, endet exakt bei contentBottomY */
  const maxRow2Block = contentBottomY - row1BodyY - GAP_MIDDLE_TO_BOTTOM
  const row2BodyH = Math.max(0.55, maxRow2Block - SECTION_LABEL_H - 0.02)
  const row2BodyY = contentBottomY - row2BodyH
  const row2LabelY = row2BodyY - SECTION_LABEL_H - 0.02
  const row1BodyH = row2LabelY - GAP_MIDDLE_TO_BOTTOM - row1BodyY

  slide.addText(clipNormalized(input.summary, 620), {
    x: LEFT.x,
    y: row1BodyY,
    w: LEFT.w,
    h: Math.max(0.35, row1BodyH),
    fontSize: 10,
    color: '334155',
    valign: 'top',
    wrap: true,
    fontFace: 'Arial',
  })

  slide.addText(clipNormalized(input.ourSolution, 620), {
    x: RIGHT.x,
    y: row1BodyY,
    w: RIGHT.w,
    h: Math.max(0.35, row1BodyH),
    fontSize: 10,
    color: '334155',
    valign: 'top',
    wrap: true,
    fontFace: 'Arial',
  })

  slide.addText('Herausforderung', {
    x: LEFT.x,
    y: row2LabelY,
    w: LEFT.w,
    h: SECTION_LABEL_H,
    fontSize: 11,
    bold: true,
    color: '1D4ED8',
    fontFace: 'Arial',
    valign: 'top',
  })
  slide.addText('Kennzahlen & Rahmen', {
    x: RIGHT.x,
    y: row2LabelY,
    w: RIGHT.w,
    h: SECTION_LABEL_H,
    fontSize: 11,
    bold: true,
    color: '1D4ED8',
    fontFace: 'Arial',
    valign: 'top',
  })

  const challengeMaxChars = Math.min(500, Math.max(220, Math.floor(340 * (row2BodyH / 0.95))))
  const metricsMaxChars = 260

  slide.addText(clipNormalized(input.customerChallenge, challengeMaxChars), {
    x: LEFT.x,
    y: row2BodyY,
    w: LEFT.w,
    h: Math.max(0.2, row2BodyH),
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
    input.tags ? `Tags: ${clip(input.tags, 80)}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  slide.addText(clipNormalized(metrics || '—', metricsMaxChars), {
    x: RIGHT.x,
    y: row2BodyY,
    w: RIGHT.w,
    h: Math.max(0.2, row2BodyH),
    fontSize: 10,
    color: '334155',
    valign: 'top',
    wrap: true,
    fontFace: 'Arial',
  })

  slide.addText(
    clip(
      `Erstellt mit RefStack · ${input.orgName} · ${new Date().toLocaleDateString('de-DE')} · Nur gemäß Freigabestatus verwenden.`,
      240
    ),
    {
      x: EDGE,
      y: FOOTER_Y,
      w: FULL_W,
      h: FOOTER_H,
      fontSize: 8,
      color: '94A3B8',
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    }
  )

  const out = await pptx.write({ outputType: 'nodebuffer' })
  return out as Buffer
}

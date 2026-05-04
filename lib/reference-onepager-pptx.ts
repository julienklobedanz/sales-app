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

/** Zeilenhöhe in Zoll (Arial-ähnlich, konservativ → eher etwas mehr Platz). */
function lineHeightInches(fontSizePt: number): number {
  return fontSizePt * 0.015
}

function charsPerLineForWidth(boxWidthIn: number, fontSizePt: number): number {
  const avgCharPt = fontSizePt * 0.52
  return Math.max(18, Math.floor((boxWidthIn * 72) / avgCharPt))
}

/**
 * Geschätzte Höhe des Fließtextes in Zoll (mit Umbruch), damit Folienabschnitte untereinander
 * platziert werden können ohne mit fixen Y-Werten zu kollidieren.
 */
function estimateBodyHeightInches(text: string, boxWidthIn: number, fontSizePt: number): number {
  const t = String(text ?? '').trim()
  const lh = lineHeightInches(fontSizePt)
  if (!t || t === '—') return lh * 0.85
  const cpl = charsPerLineForWidth(boxWidthIn, fontSizePt)
  let lines = 0
  for (const line of t.split('\n')) {
    const p = line.trim()
    if (!p) continue
    lines += Math.max(1, Math.ceil(p.length / cpl))
  }
  if (lines === 0) lines = 1
  return lines * lh + 0.04
}

/** Maximale Zeichenzahl, die in maxHeightIn Zoll voraussichtlich ohne Überlauf passt. */
function maxCharsForHeight(
  boxWidthIn: number,
  fontSizePt: number,
  maxHeightIn: number,
  hardCap: number
): number {
  const lh = lineHeightInches(fontSizePt)
  const maxLines = Math.max(1, Math.floor((maxHeightIn - 0.06) / lh))
  const cpl = charsPerLineForWidth(boxWidthIn, fontSizePt)
  return Math.min(hardCap, Math.max(32, maxLines * cpl - 14))
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
  /** Titel → Fließtext */
  const GAP_AFTER_SECTION_TITLE = 0.04
  /** Ende erster Block → Titel zweiter Block (gleich in beiden Spalten). */
  const GAP_BETWEEN_STACKED_SECTIONS = 0.14

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

  const row1BodyY = row1LabelY + SECTION_LABEL_H + GAP_AFTER_SECTION_TITLE

  /** Mindesthöhe für zweite Sektion (Titel + Text) oberhalb des Footers */
  const minRow2Block =
    SECTION_LABEL_H + GAP_AFTER_SECTION_TITLE + 0.42
  let maxRow1Body = contentBottomY - row1BodyY - GAP_BETWEEN_STACKED_SECTIONS - minRow2Block
  maxRow1Body = Math.max(0.45, maxRow1Body)

  const summaryText = clipNormalized(
    input.summary,
    maxCharsForHeight(LEFT.w, 10, maxRow1Body, 620)
  )
  const solutionText = clipNormalized(
    input.ourSolution,
    maxCharsForHeight(RIGHT.w, 10, maxRow1Body, 620)
  )

  const estSummaryH = Math.min(estimateBodyHeightInches(summaryText, LEFT.w, 10), maxRow1Body)
  const estSolutionH = Math.min(estimateBodyHeightInches(solutionText, RIGHT.w, 10), maxRow1Body)
  const row1StackH = Math.max(estSummaryH, estSolutionH)

  const row2LabelY = row1BodyY + row1StackH + GAP_BETWEEN_STACKED_SECTIONS

  slide.addText(summaryText, {
    x: LEFT.x,
    y: row1BodyY,
    w: LEFT.w,
    h: Math.max(0.18, estSummaryH),
    fontSize: 10,
    color: '334155',
    valign: 'top',
    wrap: true,
    fontFace: 'Arial',
  })

  slide.addText(solutionText, {
    x: RIGHT.x,
    y: row1BodyY,
    w: RIGHT.w,
    h: Math.max(0.18, estSolutionH),
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

  const row2BodyY = row2LabelY + SECTION_LABEL_H + GAP_AFTER_SECTION_TITLE
  const row2BodyH = Math.max(0.22, contentBottomY - row2BodyY)

  const challengeMaxChars = maxCharsForHeight(LEFT.w, 10, row2BodyH, 500)
  const metricsMaxChars = maxCharsForHeight(RIGHT.w, 10, row2BodyH, 260)

  slide.addText(clipNormalized(input.customerChallenge, challengeMaxChars), {
    x: LEFT.x,
    y: row2BodyY,
    w: LEFT.w,
    h: row2BodyH,
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
    h: row2BodyH,
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

import PptxGenJS from 'pptxgenjs'

/** PptxGenJS LAYOUT_16x9 — alle Y/H-Werte in Zoll, damit nichts unter 5.625" ragt */
const SLIDE_H_IN = 5.625

const BODY_FONT_PREFERRED_PT = 10
const BODY_FONT_MIN_PT = 5
const LAYOUT_HEIGHT_SAFETY = 1.06
const BODY_FONT_STEP_PT = 0.5

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

/** Nur für Kopf-/Fußzeile: harte Zeichenbegrenzung mit „…“ */
function clipHeader(text: string | null | undefined, maxChars: number): string {
  const t = String(text ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!t) return '—'
  return t.length <= maxChars ? t : `${t.slice(0, maxChars - 1)}…`
}

/** Bento-/Editor-Zeilenumbrüche zusammenführen; Bullet-Zeilen bleiben eigene Zeilen */
export function normalizePptxFlowText(value: string | null | undefined): string {
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

function flowTextOrDash(value: string | null | undefined): string {
  const t = normalizePptxFlowText(value)
  return t || '—'
}

/** Zeilenhöhe in Zoll (Arial-ähnlich, leicht konservativ für PowerPoint-Rendering). */
export function lineHeightInches(fontSizePt: number): number {
  return fontSizePt * 0.016
}

function charsPerLineForWidth(boxWidthIn: number, fontSizePt: number): number {
  const avgCharPt = fontSizePt * 0.5
  return Math.max(16, Math.floor((boxWidthIn * 72) / avgCharPt))
}

/** Geschätzte Höhe des Fließtextes in Zoll (mit Umbruch). */
export function estimateBodyHeightInches(text: string, boxWidthIn: number, fontSizePt: number): number {
  const t = String(text ?? '').trim()
  const lh = lineHeightInches(fontSizePt)
  if (!t || t === '—') return lh * 0.9
  const cpl = charsPerLineForWidth(boxWidthIn, fontSizePt)
  let lines = 0
  for (const line of t.split('\n')) {
    const p = line.trim()
    if (!p) continue
    lines += Math.max(1, Math.ceil(p.length / cpl))
  }
  if (lines === 0) lines = 1
  return lines * lh + 0.06
}

export type OnepagerBodyLayoutInput = {
  summary: string
  projektDetails: string
  challenge: string
  solution: string
  leftW: number
  rightW: number
  maxRow1Body: number
  row1BodyY: number
  contentBottomY: number
  gapBetweenSections: number
  sectionLabelH: number
  gapAfterSectionTitle: number
  minRow2Body: number
}

/** Größte Schriftgröße, bei der alle vier Fließtext-Blöcke ohne Überlapp in den Footer passen. */
export function pickOnepagerBodyFontPt(input: OnepagerBodyLayoutInput): number {
  for (let pt = BODY_FONT_PREFERRED_PT; pt >= BODY_FONT_MIN_PT; pt -= BODY_FONT_STEP_PT) {
    const summaryH = estimateBodyHeightInches(input.summary, input.leftW, pt)
    const detailsH = estimateBodyHeightInches(input.projektDetails, input.rightW, pt)
    const row1StackH = Math.max(summaryH, detailsH)
    if (row1StackH * LAYOUT_HEIGHT_SAFETY > input.maxRow1Body) continue

    const row2BodyY =
      input.row1BodyY +
      row1StackH +
      input.gapBetweenSections +
      input.sectionLabelH +
      input.gapAfterSectionTitle
    const row2BodyH = input.contentBottomY - row2BodyY
    if (row2BodyH < input.minRow2Body) continue

    const challengeH = estimateBodyHeightInches(input.challenge, input.leftW, pt)
    const solutionH = estimateBodyHeightInches(input.solution, input.rightW, pt)
    if (
      challengeH * LAYOUT_HEIGHT_SAFETY <= row2BodyH &&
      solutionH * LAYOUT_HEIGHT_SAFETY <= row2BodyH
    ) {
      return pt
    }
  }
  return BODY_FONT_MIN_PT
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
  const contentBottomY = SLIDE_H_IN - FOOTER_BOTTOM_MARGIN - FOOTER_H - GAP_ABOVE_FOOTER
  const FOOTER_Y = SLIDE_H_IN - FOOTER_BOTTOM_MARGIN - FOOTER_H

  const LEFT = { x: EDGE, w: 4.35 }
  const RIGHT = { x: 5.0, w: 4.55 }
  const FULL_W = 10 - EDGE * 2

  const SECTION_LABEL_H = 0.22
  const GAP_AFTER_LEGAL = 0.08
  const GAP_AFTER_SECTION_TITLE = 0.04
  const GAP_BETWEEN_STACKED_SECTIONS = 0.14

  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: TOP_BAR_H, fill: { color: '2563EB' } })

  let y = TOP_BAR_H + 0.04

  slide.addText(clipHeader(normalizePptxFlowText(input.title), 140), {
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
    clipHeader(
      [input.companyName, input.industry, input.country].filter(Boolean).join(' · ') || '—',
      200
    ),
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

  slide.addText(clipHeader(input.legalLine, 220), {
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
  slide.addText('Zusammenfassung', {
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
  slide.addText('Projektdetails', {
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
  const minRow2Block = SECTION_LABEL_H + GAP_AFTER_SECTION_TITLE + 0.42
  let maxRow1Body = contentBottomY - row1BodyY - GAP_BETWEEN_STACKED_SECTIONS - minRow2Block
  maxRow1Body = Math.max(0.45, maxRow1Body)

  const projektDetailsRaw = [
    input.volumeEur ? `Volumen: ${input.volumeEur}` : null,
    input.contractType ? `Vertragsart: ${input.contractType}` : null,
    input.projectStart ? `Projektstart: ${input.projectStart}` : null,
    input.projectEnd ? `Projektende: ${input.projectEnd}` : null,
    input.tags ? `Tags: ${clipHeader(input.tags, 80)}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const summaryText = flowTextOrDash(input.summary)
  const projektDetailsText = flowTextOrDash(projektDetailsRaw || null)
  const challengeText = flowTextOrDash(input.customerChallenge)
  const solutionText = flowTextOrDash(input.ourSolution)

  const bodyFontPt = pickOnepagerBodyFontPt({
    summary: summaryText,
    projektDetails: projektDetailsText,
    challenge: challengeText,
    solution: solutionText,
    leftW: LEFT.w,
    rightW: RIGHT.w,
    maxRow1Body,
    row1BodyY,
    contentBottomY,
    gapBetweenSections: GAP_BETWEEN_STACKED_SECTIONS,
    sectionLabelH: SECTION_LABEL_H,
    gapAfterSectionTitle: GAP_AFTER_SECTION_TITLE,
    minRow2Body: 0.22,
  })

  const estSummaryH = Math.min(estimateBodyHeightInches(summaryText, LEFT.w, bodyFontPt), maxRow1Body)
  const estProjektDetailsH = Math.min(
    estimateBodyHeightInches(projektDetailsText, RIGHT.w, bodyFontPt),
    maxRow1Body
  )
  const row1StackH = Math.max(estSummaryH, estProjektDetailsH)
  const row2LabelY = row1BodyY + row1StackH + GAP_BETWEEN_STACKED_SECTIONS
  const row2BodyY = row2LabelY + SECTION_LABEL_H + GAP_AFTER_SECTION_TITLE
  const row2BodyH = Math.max(0.22, contentBottomY - row2BodyY)

  slide.addText(summaryText, {
    x: LEFT.x,
    y: row1BodyY,
    w: LEFT.w,
    h: Math.max(0.18, estSummaryH),
    fontSize: bodyFontPt,
    color: '334155',
    valign: 'top',
    wrap: true,
    fontFace: 'Arial',
  })

  slide.addText(projektDetailsText, {
    x: RIGHT.x,
    y: row1BodyY,
    w: RIGHT.w,
    h: Math.max(0.18, estProjektDetailsH),
    fontSize: bodyFontPt,
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
  slide.addText('Lösung', {
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

  slide.addText(challengeText, {
    x: LEFT.x,
    y: row2BodyY,
    w: LEFT.w,
    h: row2BodyH,
    fontSize: bodyFontPt,
    color: '334155',
    valign: 'top',
    wrap: true,
    fontFace: 'Arial',
  })

  slide.addText(solutionText, {
    x: RIGHT.x,
    y: row2BodyY,
    w: RIGHT.w,
    h: row2BodyH,
    fontSize: bodyFontPt,
    color: '334155',
    valign: 'top',
    wrap: true,
    fontFace: 'Arial',
  })

  slide.addText(
    clipHeader(
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

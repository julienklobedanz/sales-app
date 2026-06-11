import PptxGenJS from 'pptxgenjs'

/** PptxGenJS LAYOUT_16x9 — 10" × 5.625" */
export const SLIDE_W_IN = 10
export const SLIDE_H_IN = 5.625

export const PPTX_COLORS = {
  heading: '1E293B',
  body: '334155',
  muted: '94A3B8',
  subline: '64748B',
  factLabel: '64748B',
  premiumBg: '1E293B',
  premiumText: 'F8FAFC',
  headerTitle: 'F8FAFC',
  headerSubline: 'CBD5E1',
  sidebarBg: 'F8FAFC',
  sidebarBorder: 'E2E8F0',
  footer: '94A3B8',
  warnAccent: 'F59E0B',
  warnBorder: 'FDE68A',
} as const

export const PPTX_LAYOUT = {
  EDGE: 0.6,
  LEFT_X: 0.6,
  LEFT_STORY_W: 6.2,
  RIGHT_X: 7.2,
  RIGHT_W: 2.6,
  RIGHT_Y: 1.66,
  RIGHT_H: 3.65,
  HEADER_BAND_H: 1.54,
  TITLE_Y: 0.32,
  SUBLINE_Y: 0.76,
  SUMMARY_Y: 1.05,
  SUMMARY_H: 0.38,
  FOOTER_Y: 5.38,
} as const

export const PPTX_BULLET_FONT_PT = 10
export const PPTX_FACT_FONT_PT = 10

export function clipPptxHeader(text: string | null | undefined, maxChars: number): string {
  const t = String(text ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!t) return '—'
  return t.length <= maxChars ? t : `${t.slice(0, maxChars - 1)}…`
}

export function addPptxSectionLabel(
  slide: PptxGenJS.Slide,
  label: string,
  x: number,
  y: number,
  w: number
) {
  slide.addText(label.toUpperCase(), {
    x,
    y,
    w,
    h: 0.22,
    fontSize: 8,
    bold: true,
    charSpacing: 0.6,
    color: PPTX_COLORS.muted,
    fontFace: 'Arial',
    valign: 'top',
  })
}

export function addPptxFixedBullets(
  slide: PptxGenJS.Slide,
  bullets: string[],
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (bullets.length === 0) {
    slide.addText('—', {
      x,
      y,
      w,
      h,
      fontSize: PPTX_BULLET_FONT_PT,
      color: PPTX_COLORS.body,
      fontFace: 'Arial',
      valign: 'top',
      wrap: true,
    })
    return
  }

  const runs = bullets.map((bullet, index) => ({
    text: bullet,
    options: {
      bullet: true,
      breakLine: index < bullets.length - 1,
      fontSize: PPTX_BULLET_FONT_PT,
      color: PPTX_COLORS.body,
      fontFace: 'Arial',
      paraSpaceAfter: 3,
    },
  }))

  slide.addText(runs, {
    x,
    y,
    w,
    h,
    valign: 'top',
    wrap: true,
    lineSpacingMultiple: 1.25,
  })
}

export function addPptxPremiumHeaderBand(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  input: {
    title: string
    subline: string
    summary?: string | null
    titleW: number
    contentW: number
  }
) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W_IN,
    h: PPTX_LAYOUT.HEADER_BAND_H,
    fill: { color: PPTX_COLORS.premiumBg },
    line: { width: 0 },
  })

  slide.addText(input.title, {
    x: PPTX_LAYOUT.EDGE,
    y: PPTX_LAYOUT.TITLE_Y,
    w: input.titleW,
    h: 0.44,
    fontSize: 24,
    bold: true,
    color: PPTX_COLORS.headerTitle,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  })

  slide.addText(input.subline, {
    x: PPTX_LAYOUT.EDGE,
    y: PPTX_LAYOUT.SUBLINE_Y,
    w: input.contentW,
    h: 0.18,
    fontSize: 10,
    color: PPTX_COLORS.headerSubline,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  })

  const summaryText = input.summary?.trim()
  if (summaryText) {
    slide.addText(summaryText, {
      x: PPTX_LAYOUT.EDGE,
      y: PPTX_LAYOUT.SUMMARY_Y,
      w: input.contentW - 0.1,
      h: PPTX_LAYOUT.SUMMARY_H,
      fontSize: 11,
      color: PPTX_COLORS.premiumText,
      fontFace: 'Arial',
      italic: true,
      valign: 'top',
      wrap: true,
      lineSpacingMultiple: 1.2,
    })
  }
}

export type PptxFactRow = { label: string; value: string }

export function addPptxSidebarCard(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  box: { x: number; y: number; w: number; h: number },
  options?: { accentTop?: boolean }
) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    fill: { color: PPTX_COLORS.sidebarBg },
    line: { color: PPTX_COLORS.sidebarBorder, width: 0.5 },
    rectRadius: 0.08,
  })

  if (options?.accentTop) {
    slide.addShape(pptx.ShapeType.rect, {
      x: box.x + 0.04,
      y: box.y,
      w: box.w - 0.08,
      h: 0.04,
      fill: { color: PPTX_COLORS.warnAccent },
      line: { width: 0 },
    })
  }
}

export function addPptxFactRowsCard(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  box: { x: number; y: number; w: number; h: number },
  title: string,
  rows: PptxFactRow[],
  options?: { accentTop?: boolean }
) {
  addPptxSidebarCard(slide, pptx, box, options)

  const padX = 0.16
  const padY = 0.15
  const padRight = 0.12
  const innerX = box.x + padX
  const innerW = box.w - padX - padRight
  const labelColW = 1.08
  const valueColW = 1.32
  const valueX = innerX + innerW - valueColW
  let rowY = box.y + padY + (options?.accentTop ? 0.06 : 0)

  slide.addText(title, {
    x: innerX,
    y: rowY,
    w: innerW,
    h: 0.2,
    fontSize: 10.5,
    bold: true,
    color: PPTX_COLORS.heading,
    fontFace: 'Arial',
    valign: 'top',
  })
  rowY += 0.3

  slide.addShape(pptx.ShapeType.rect, {
    x: innerX,
    y: rowY,
    w: innerW,
    h: 0.01,
    fill: { color: PPTX_COLORS.sidebarBorder },
    line: { width: 0 },
  })
  rowY += 0.12

  for (const row of rows) {
    slide.addText(row.label, {
      x: innerX,
      y: rowY,
      w: labelColW,
      h: 0.26,
      fontSize: PPTX_FACT_FONT_PT,
      color: PPTX_COLORS.factLabel,
      fontFace: 'Arial',
      valign: 'middle',
      wrap: false,
    })
    slide.addText(row.value, {
      x: valueX,
      y: rowY,
      w: valueColW,
      h: 0.26,
      fontSize: PPTX_FACT_FONT_PT,
      bold: true,
      color: PPTX_COLORS.heading,
      fontFace: 'Arial',
      align: 'right',
      valign: 'middle',
      wrap: false,
      shrinkText: true,
    })
    rowY += 0.32
  }
}

export function addPptxFooterLine(slide: PptxGenJS.Slide, text: string) {
  const contentW = SLIDE_W_IN - PPTX_LAYOUT.EDGE * 2
  slide.addText(text, {
    x: PPTX_LAYOUT.EDGE,
    y: PPTX_LAYOUT.FOOTER_Y,
    w: contentW,
    h: 0.18,
    fontSize: 8,
    color: PPTX_COLORS.footer,
    fontFace: 'Arial',
    valign: 'top',
    margin: 0,
  })
}

export function addPptxHorizontalRule(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  x: number,
  y: number,
  w: number
) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h: 0.01,
    fill: { color: PPTX_COLORS.sidebarBorder },
    line: { width: 0 },
  })
}

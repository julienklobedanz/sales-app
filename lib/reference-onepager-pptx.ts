import PptxGenJS from 'pptxgenjs'
import { formatProjectStatusDe } from '@/lib/public-portfolio/kpis-for-reference'

/** PptxGenJS LAYOUT_16x9 — 10" × 5.625" */
const SLIDE_W_IN = 10
const SLIDE_H_IN = 5.625

const COLORS = {
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
} as const

/**
 * Fixes Raster — abgeleitet aus dem manuellen Ziel-PPTX (AT&T Network 5G Onepager).
 * Alle Y-Werte absolut; Story endet vor dem Footer bei y ≈ 5.25.
 */
const LAYOUT = {
  EDGE: 0.6,
  LEFT_X: 0.6,
  /** Strikt: linke Spalte endet bei x ≈ 6.8, rechte Box ab x = 7.2 */
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
  CHALLENGE_LABEL_Y: 1.71,
  CHALLENGE_BULLETS_Y: 1.95,
  CHALLENGE_BULLETS_H: 1.55,
  SOLUTION_LABEL_Y: 3.46,
  SOLUTION_BULLETS_Y: 3.7,
  SOLUTION_BULLETS_H: 1.55,
  LOGO_BOX: 0.44,
  FOOTER_Y: 5.38,
} as const

const BULLET_FONT_PT = 10
const FACT_FONT_PT = 10
const BULLET_LINE_RE = /^[•\u2022\-*]\s*|^\d+\.\s+/
const PPTX_MAX_BULLETS = 5
/** Hartes Limit — verhindert mehr als ~2 Zeilen pro Bullet */
const PPTX_BULLET_MAX_CHARS = 85

export type ReferenceOnepagerPptxInput = {
  title: string
  companyName: string
  status: string
  projectStatus: string | null
  summary: string | null
  industry: string | null
  country: string | null
  customerChallenge: string | null
  ourSolution: string | null
  volumeEur: string | null
  contractType: string | null
  projectStart: string | null
  projectEnd: string | null
  logoUrl: string | null
  orgName: string
  exportedAtLabel?: string
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
  const isBullet = (t: string) => BULLET_LINE_RE.test(t)
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

export function clipPptxBullet(text: string, maxChars: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return '—'
  if (t.length <= maxChars) return t
  return `${t.slice(0, maxChars - 3).trim()}...`
}

function extractStoryBulletsForPptx(
  value: string | null | undefined,
  options?: { splitOnPeriod?: boolean }
): string[] {
  const normalized = normalizePptxFlowText(value)
  if (!normalized) return ['—']

  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean)
  const bulletLines = lines.filter((l) => BULLET_LINE_RE.test(l))

  if (bulletLines.length > 0) {
    return bulletLines
      .map((l) => l.replace(BULLET_LINE_RE, '').trim())
      .filter(Boolean)
      .slice(0, PPTX_MAX_BULLETS)
      .map((b) => clipPptxBullet(b, PPTX_BULLET_MAX_CHARS))
  }

  const prose = normalized.replace(/\n+/g, ' ').trim()
  const sentences = (options?.splitOnPeriod
    ? prose.split('.').map((s) => s.trim()).filter((s) => s.length > 8)
    : prose.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 8)
  )
    .slice(0, PPTX_MAX_BULLETS)
    .map((s) => {
      const withPeriod = options?.splitOnPeriod && !s.endsWith('.') ? `${s}.` : s
      return clipPptxBullet(withPeriod, PPTX_BULLET_MAX_CHARS)
    })

  return sentences.length > 0 ? sentences : [clipPptxBullet(prose, PPTX_BULLET_MAX_CHARS)]
}

/** Herausforderung: max. 5 einzeilige Bullets. */
export function extractChallengeBulletsForPptx(value: string | null | undefined): string[] {
  return extractStoryBulletsForPptx(value)
}

/** Lösung: max. 5 Sätze (Punkt-Split), je ein Bullet. */
export function extractSolutionBulletsForPptx(value: string | null | undefined): string[] {
  return extractStoryBulletsForPptx(value, { splitOnPeriod: true })
}

/** @deprecated Nur noch für Tests — Layout nutzt feste Koordinaten */
export function extractBulletPoints(
  value: string | null | undefined,
  options?: { max?: number }
): string[] {
  const max = options?.max ?? 5
  return extractChallengeBulletsForPptx(value).slice(0, max)
}

function charsPerLine(boxWidthIn: number, fontSizePt: number): number {
  const avgCharPt = fontSizePt * 0.5
  return Math.max(14, Math.floor((boxWidthIn * 72) / avgCharPt))
}

/** @deprecated Layout nutzt feste Koordinaten */
export function estimateBulletBlockHeight(
  bullets: string[],
  boxWidthIn: number,
  fontSizePt = BULLET_FONT_PT
): number {
  const labelH = 0.22
  const lineH = fontSizePt * 0.016 * 1.35
  const cpl = charsPerLine(boxWidthIn, fontSizePt)
  const items = bullets.length > 0 ? bullets : ['—']
  let lines = 0
  for (const bullet of items) {
    lines += Math.max(1, Math.ceil(bullet.length / cpl))
  }
  return labelH + lines * lineH + 0.08
}

function mimeToPptxImagePrefix(contentType: string): string | null {
  const ct = contentType.toLowerCase()
  if (ct.includes('png')) return 'image/png'
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'image/jpeg'
  if (ct.includes('gif')) return 'image/gif'
  if (ct.includes('webp')) return 'image/webp'
  if (ct.includes('svg')) return null
  return null
}

/**
 * PptxGenJS erwartet `image/png;base64,...` (ohne `data:`-Prefix) oder eine gültige http(s)-URL.
 */
export async function resolvePptxLogoSource(
  url: string | null | undefined
): Promise<{ kind: 'data'; value: string } | { kind: 'path'; value: string } | null> {
  const trimmed = String(url ?? '').trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const res = await fetch(trimmed, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return null
      const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim()
      const prefix = mimeToPptxImagePrefix(contentType)
      if (!prefix) return null
      const bytes = Buffer.from(await res.arrayBuffer())
      if (bytes.length < 32) return null
      return { kind: 'data', value: `${prefix};base64,${bytes.toString('base64')}` }
    } catch {
      return null
    }
  }

  const dataUri = /^data:([^;]+);base64,(.+)$/i.exec(trimmed)
  if (dataUri) {
    const prefix = mimeToPptxImagePrefix(dataUri[1])
    if (!prefix || !dataUri[2]?.trim()) return null
    return { kind: 'data', value: `${prefix};base64,${dataUri[2].trim()}` }
  }

  return null
}

export function clipExecutiveSummary(value: string | null | undefined, maxChars = 165): string {
  const t = normalizePptxFlowText(value).replace(/\n+/g, ' ').trim()
  if (!t) return ''
  if (t.length <= maxChars) return t
  const cut = t.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = (lastSpace > 70 ? cut.slice(0, lastSpace) : cut).trim()
  return `${trimmed}…`
}

function referenceStatusLabelDe(status: string): string {
  const s = String(status ?? '').toLowerCase()
  if (s === 'approved' || s === 'external') return 'Freigegeben'
  if (s === 'internal_only' || s === 'internal') return 'Intern'
  if (s === 'anonymized' || s === 'anonymous') return 'Anonymisiert'
  if (s === 'pending') return 'Freigabe ausstehend'
  return 'Entwurf'
}

export type StatusPillStyle = {
  label: string
  fill: string
  line: string
  text: string
}

export function resolveStatusPill(
  referenceStatus: string,
  projectStatus: string | null | undefined
): StatusPillStyle {
  const projectLabel = formatProjectStatusDe(projectStatus)
  const label = projectLabel || referenceStatusLabelDe(referenceStatus)
  const key = `${String(projectStatus ?? '').toLowerCase()} ${String(referenceStatus ?? '').toLowerCase()} ${label.toLowerCase()}`

  if (/abgeschlossen|completed|complete|done|freigegeben|approved|external/.test(key)) {
    return { label, fill: 'ECFDF5', line: 'BBF7D0', text: '047857' }
  }
  if (/aktiv|active/.test(key)) {
    return { label, fill: 'EFF6FF', line: 'BFDBFE', text: '1D4ED8' }
  }
  if (/ausstehend|pending|pausiert|on_hold/.test(key)) {
    return { label, fill: 'FFFBEB', line: 'FDE68A', text: 'B45309' }
  }
  if (/intern|anonym/.test(key)) {
    return { label, fill: 'F1F5F9', line: 'E2E8F0', text: '475569' }
  }
  return { label, fill: 'F1F5F9', line: 'E2E8F0', text: '475569' }
}

function buildSubline(input: ReferenceOnepagerPptxInput): string {
  return [input.companyName, input.industry, input.country].filter(Boolean).join(' · ') || '—'
}

type FactRow = { label: string; value: string }

function buildFactRows(input: ReferenceOnepagerPptxInput): FactRow[] {
  const dash = (v: string | null | undefined) => {
    const t = String(v ?? '').trim()
    return t || '—'
  }
  return [
    { label: 'Volumen', value: dash(input.volumeEur) },
    { label: 'Vertragsart', value: dash(input.contractType) },
    { label: 'Projektstart', value: dash(input.projectStart) },
    { label: 'Projektende', value: dash(input.projectEnd) },
  ]
}

function addSectionLabel(
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
    color: COLORS.muted,
    fontFace: 'Arial',
    valign: 'top',
  })
}

function addFixedBullets(
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
      fontSize: BULLET_FONT_PT,
      color: COLORS.body,
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
      fontSize: BULLET_FONT_PT,
      color: COLORS.body,
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

function addStatusPill(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  pill: StatusPillStyle,
  x: number,
  y: number
) {
  const pillW = Math.min(1.55, 0.11 * pill.label.length + 0.55)
  const pillH = 0.22
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w: pillW,
    h: pillH,
    fill: { color: pill.fill },
    line: { color: pill.line, width: 0.75 },
    rectRadius: 0.06,
  })
  slide.addText(pill.label, {
    x,
    y,
    w: pillW,
    h: pillH,
    fontSize: 8,
    bold: true,
    color: pill.text,
    fontFace: 'Arial',
    align: 'center',
    valign: 'middle',
  })
}

function addPremiumHeaderBand(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  input: {
    title: string
    subline: string
    summary: string | null
    titleW: number
    contentW: number
  }
) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W_IN,
    h: LAYOUT.HEADER_BAND_H,
    fill: { color: COLORS.premiumBg },
    line: { width: 0 },
  })

  slide.addText(input.title, {
    x: LAYOUT.EDGE,
    y: LAYOUT.TITLE_Y,
    w: input.titleW,
    h: 0.44,
    fontSize: 24,
    bold: true,
    color: COLORS.headerTitle,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  })

  slide.addText(input.subline, {
    x: LAYOUT.EDGE,
    y: LAYOUT.SUBLINE_Y,
    w: input.contentW,
    h: 0.18,
    fontSize: 10,
    color: COLORS.headerSubline,
    fontFace: 'Arial',
    valign: 'top',
    wrap: true,
  })

  const summaryText = clipExecutiveSummary(input.summary, 155)
  if (summaryText) {
    slide.addText(summaryText, {
      x: LAYOUT.EDGE,
      y: LAYOUT.SUMMARY_Y,
      w: input.contentW - 0.1,
      h: LAYOUT.SUMMARY_H,
      fontSize: 11,
      color: COLORS.premiumText,
      fontFace: 'Arial',
      italic: true,
      valign: 'top',
      wrap: true,
      lineSpacingMultiple: 1.2,
    })
  }
}

function addFactSheet(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  input: ReferenceOnepagerPptxInput,
  box: { x: number; y: number; w: number; h: number }
) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    fill: { color: COLORS.sidebarBg },
    line: { color: COLORS.sidebarBorder, width: 0.5 },
    rectRadius: 0.08,
  })

  const padX = 0.16
  const padY = 0.15
  const padRight = 0.12
  const innerX = box.x + padX
  const innerW = box.w - padX - padRight
  const labelColW = 1.08
  const valueColW = 1.32
  const valueX = innerX + innerW - valueColW
  let rowY = box.y + padY

  slide.addText('Projektdetails', {
    x: innerX,
    y: rowY,
    w: innerW,
    h: 0.2,
    fontSize: 10.5,
    bold: true,
    color: COLORS.heading,
    fontFace: 'Arial',
    valign: 'top',
  })
  rowY += 0.26

  const pill = resolveStatusPill(input.status, input.projectStatus)
  addStatusPill(slide, pptx, pill, innerX, rowY)
  rowY += 0.44

  slide.addShape(pptx.ShapeType.rect, {
    x: innerX,
    y: rowY,
    w: innerW,
    h: 0.01,
    fill: { color: COLORS.sidebarBorder },
    line: { width: 0 },
  })
  rowY += 0.12

  for (const row of buildFactRows(input)) {
    slide.addText(row.label, {
      x: innerX,
      y: rowY,
      w: labelColW,
      h: 0.26,
      fontSize: FACT_FONT_PT,
      color: COLORS.factLabel,
      fontFace: 'Arial',
      valign: 'middle',
      wrap: false,
    })
    slide.addText(row.value, {
      x: valueX,
      y: rowY,
      w: valueColW,
      h: 0.26,
      fontSize: FACT_FONT_PT,
      bold: true,
      color: COLORS.heading,
      fontFace: 'Arial',
      align: 'right',
      valign: 'middle',
      wrap: false,
      shrinkText: true,
    })
    rowY += 0.32
  }
}

function addLogoContained(
  slide: PptxGenJS.Slide,
  logoSource: { kind: 'data'; value: string } | { kind: 'path'; value: string },
  x: number,
  y: number
) {
  const box = LAYOUT.LOGO_BOX
  slide.addImage({
    ...(logoSource.kind === 'data' ? { data: logoSource.value } : { path: logoSource.value }),
    x,
    y,
    w: box,
    h: box,
    sizing: { type: 'contain', w: box, h: box },
  })
}

export async function buildReferenceOnepagerPptxBuffer(input: ReferenceOnepagerPptxInput): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  pptx.author = input.orgName
  pptx.company = input.orgName
  pptx.subject = 'Referenz One-Pager'

  const slide = pptx.addSlide()

  const CONTENT_W = SLIDE_W_IN - LAYOUT.EDGE * 2
  const LOGO_X = SLIDE_W_IN - LAYOUT.EDGE - LAYOUT.LOGO_BOX

  const logoSource = await resolvePptxLogoSource(input.logoUrl)
  const titleW = logoSource ? LOGO_X - LAYOUT.EDGE - 0.12 : CONTENT_W

  addPremiumHeaderBand(slide, pptx, {
    title: clipHeader(normalizePptxFlowText(input.title), 120),
    subline: clipHeader(buildSubline(input), 180),
    summary: input.summary,
    titleW,
    contentW: CONTENT_W,
  })

  if (logoSource) {
    addLogoContained(slide, logoSource, LOGO_X, LAYOUT.TITLE_Y)
  }

  const challengeBullets = extractChallengeBulletsForPptx(input.customerChallenge)
  const solutionBullets = extractSolutionBulletsForPptx(input.ourSolution)

  addSectionLabel(
    slide,
    'Herausforderung',
    LAYOUT.LEFT_X,
    LAYOUT.CHALLENGE_LABEL_Y,
    LAYOUT.LEFT_STORY_W
  )
  addFixedBullets(
    slide,
    challengeBullets,
    LAYOUT.LEFT_X,
    LAYOUT.CHALLENGE_BULLETS_Y,
    LAYOUT.LEFT_STORY_W,
    LAYOUT.CHALLENGE_BULLETS_H
  )

  addSectionLabel(
    slide,
    'Unsere Lösung',
    LAYOUT.LEFT_X,
    LAYOUT.SOLUTION_LABEL_Y,
    LAYOUT.LEFT_STORY_W
  )
  addFixedBullets(
    slide,
    solutionBullets,
    LAYOUT.LEFT_X,
    LAYOUT.SOLUTION_BULLETS_Y,
    LAYOUT.LEFT_STORY_W,
    LAYOUT.SOLUTION_BULLETS_H
  )

  addFactSheet(slide, pptx, input, {
    x: LAYOUT.RIGHT_X,
    y: LAYOUT.RIGHT_Y,
    w: LAYOUT.RIGHT_W,
    h: LAYOUT.RIGHT_H,
  })

  const exportedAt =
    input.exportedAtLabel?.trim() ||
    new Date().toLocaleDateString('de-DE', { dateStyle: 'long' })

  slide.addText(`Erstellt am ${exportedAt} · ${clipHeader(input.orgName, 80)}`, {
    x: LAYOUT.EDGE,
    y: LAYOUT.FOOTER_Y,
    w: CONTENT_W,
    h: 0.18,
    fontSize: 8,
    color: COLORS.footer,
    fontFace: 'Arial',
    valign: 'top',
    margin: 0,
  })

  const out = await pptx.write({ outputType: 'nodebuffer' })
  return out as Buffer
}

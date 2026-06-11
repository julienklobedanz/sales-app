import PptxGenJS from 'pptxgenjs'

import type { ExecutiveBriefingPptxData } from '@/lib/deal-desk/resolve-executive-briefing-pptx-data'
import {
  clipPptxBullet,
  extractChallengeBulletsForPptx,
  extractSolutionBulletsForPptx,
} from '@/lib/reference-onepager-pptx'
import {
  addPptxFactRowsCard,
  addPptxFixedBullets,
  addPptxFooterLine,
  addPptxHorizontalRule,
  addPptxPremiumHeaderBand,
  addPptxSectionLabel,
  addPptxSidebarCard,
  clipPptxHeader,
  PPTX_LAYOUT,
  SLIDE_W_IN,
} from '@/lib/pptx/refstack-primitives'

const SLIDE1 = {
  ASSESS_LABEL_Y: 1.71,
  ASSESS_BULLETS_Y: 1.95,
  ASSESS_BULLETS_H: 1.35,
  TECH_LABEL_Y: 3.26,
  TECH_BULLETS_Y: 3.5,
  TECH_BULLETS_H: 1.75,
} as const

const SLIDE2 = {
  CAP_LABEL_Y: 1.71,
  CAP_BULLETS_Y: 1.95,
  CAP_BULLETS_H: 1.2,
  RULE_Y: 3.12,
  DEADLINE_LABEL_Y: 3.28,
  DEADLINE_BULLETS_Y: 3.52,
  DEADLINE_BULLETS_H: 1.73,
} as const

const BRIEFING_FOOTER = 'Erstellt mit RefStack • Nur für den internen Gebrauch'

function bulletsFromProse(value: string, max = 4): string[] {
  const fromChallenge = extractChallengeBulletsForPptx(value)
  if (fromChallenge.length > 0 && fromChallenge[0] !== '—') {
    return fromChallenge.slice(0, max)
  }
  return extractSolutionBulletsForPptx(value).slice(0, max)
}

function techScopeBullets(techFocus: string, governance: string): string[] {
  const bullets: string[] = []
  if (techFocus !== '—') bullets.push(clipPptxBullet(`Tech-Fokus: ${techFocus}`, 85))
  if (governance !== '—') bullets.push(clipPptxBullet(`Governance: ${governance}`, 85))
  return bullets.length > 0 ? bullets : ['—']
}

function addRiskPanel(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  box: { x: number; y: number; w: number; h: number },
  bullets: string[]
) {
  addPptxSidebarCard(slide, pptx, box, { accentTop: true })

  const padX = 0.16
  const innerX = box.x + padX
  const innerW = box.w - padX * 2
  let rowY = box.y + 0.2

  slide.addText('Kritisches Risk-Panel', {
    x: innerX,
    y: rowY,
    w: innerW,
    h: 0.2,
    fontSize: 10.5,
    bold: true,
    color: 'B45309',
    fontFace: 'Arial',
    valign: 'top',
  })
  rowY += 0.34

  addPptxHorizontalRule(slide, pptx, innerX, rowY, innerW)
  rowY += 0.1

  addPptxFixedBullets(slide, bullets, innerX, rowY, innerW, box.y + box.h - rowY - 0.12)
}

export async function buildExecutiveBriefingPptxBuffer(
  data: ExecutiveBriefingPptxData
): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  pptx.author = 'RefStack'
  pptx.company = 'RefStack'
  pptx.subject = 'Executive Briefing'

  const contentW = SLIDE_W_IN - PPTX_LAYOUT.EDGE * 2
  const sidebarBox = {
    x: PPTX_LAYOUT.RIGHT_X,
    y: PPTX_LAYOUT.RIGHT_Y,
    w: PPTX_LAYOUT.RIGHT_W,
    h: PPTX_LAYOUT.RIGHT_H,
  }

  const slide1 = pptx.addSlide()
  addPptxPremiumHeaderBand(slide1, pptx, {
    title: clipPptxHeader(`${data.customerName} — Executive Briefing`, 72),
    subline: clipPptxHeader(data.classification, 120),
    titleW: contentW,
    contentW,
  })

  addPptxSectionLabel(
    slide1,
    'Strategische Einschätzung',
    PPTX_LAYOUT.LEFT_X,
    SLIDE1.ASSESS_LABEL_Y,
    PPTX_LAYOUT.LEFT_STORY_W
  )
  addPptxFixedBullets(
    slide1,
    bulletsFromProse(data.strategicAssessment, 4),
    PPTX_LAYOUT.LEFT_X,
    SLIDE1.ASSESS_BULLETS_Y,
    PPTX_LAYOUT.LEFT_STORY_W,
    SLIDE1.ASSESS_BULLETS_H
  )

  addPptxSectionLabel(
    slide1,
    'Tech-Fokus / Scope',
    PPTX_LAYOUT.LEFT_X,
    SLIDE1.TECH_LABEL_Y,
    PPTX_LAYOUT.LEFT_STORY_W
  )
  addPptxFixedBullets(
    slide1,
    techScopeBullets(data.techFocus, data.governance),
    PPTX_LAYOUT.LEFT_X,
    SLIDE1.TECH_BULLETS_Y,
    PPTX_LAYOUT.LEFT_STORY_W,
    SLIDE1.TECH_BULLETS_H
  )

  addPptxFactRowsCard(slide1, pptx, sidebarBox, 'Commercials & Deadlines', [
    { label: 'Volumen', value: data.volume },
    { label: 'Laufzeit', value: data.runtime },
    { label: 'Bid-Investment', value: data.bidInvestment },
    { label: 'Abgabedatum', value: data.submissionDeadline },
  ])

  addPptxFooterLine(slide1, BRIEFING_FOOTER)

  const slide2 = pptx.addSlide()
  addPptxPremiumHeaderBand(slide2, pptx, {
    title: 'Risiko- & Ressourcen-Analyse',
    subline: 'Eignung & kritische Faktoren',
    titleW: contentW,
    contentW,
  })

  addPptxSectionLabel(
    slide2,
    'Geforderte Capabilities',
    PPTX_LAYOUT.LEFT_X,
    SLIDE2.CAP_LABEL_Y,
    PPTX_LAYOUT.LEFT_STORY_W
  )
  addPptxFixedBullets(
    slide2,
    data.capabilityBullets.map((b) => clipPptxBullet(b, 85)),
    PPTX_LAYOUT.LEFT_X,
    SLIDE2.CAP_BULLETS_Y,
    PPTX_LAYOUT.LEFT_STORY_W,
    SLIDE2.CAP_BULLETS_H
  )

  addPptxHorizontalRule(
    slide2,
    pptx,
    PPTX_LAYOUT.LEFT_X,
    SLIDE2.RULE_Y,
    PPTX_LAYOUT.LEFT_STORY_W
  )

  addPptxSectionLabel(
    slide2,
    'Nächste Fristen & offene SME-Punkte',
    PPTX_LAYOUT.LEFT_X,
    SLIDE2.DEADLINE_LABEL_Y,
    PPTX_LAYOUT.LEFT_STORY_W
  )
  addPptxFixedBullets(
    slide2,
    [...data.deadlineBullets, ...data.smeBullets].map((b) => clipPptxBullet(b, 85)).slice(0, 5),
    PPTX_LAYOUT.LEFT_X,
    SLIDE2.DEADLINE_BULLETS_Y,
    PPTX_LAYOUT.LEFT_STORY_W,
    SLIDE2.DEADLINE_BULLETS_H
  )

  addRiskPanel(slide2, pptx, sidebarBox, data.riskBullets.map((b) => clipPptxBullet(b, 85)))

  addPptxFooterLine(slide2, BRIEFING_FOOTER)

  const out = await pptx.write({ outputType: 'nodebuffer' })
  return out as Buffer
}

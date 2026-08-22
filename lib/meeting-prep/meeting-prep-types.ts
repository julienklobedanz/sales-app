import { ROUTES } from '@/lib/routes'

export const MEETING_PREP_SNAPSHOT_VERSION = 1 as const

export type MeetingPrepSignalRow = {
  id: string
  kind: 'exec' | 'news'
  label: string
  dateIso: string
  signalKey: string
}

export type MeetingPrepNewsRiskRow = {
  id: string
  headline: string
  detail: string
  publishedOn: string
}

export type MeetingPrepReferenceRow = {
  id: string
  title: string
  similarity: number
  snippet: string | null
  href: string
}

type MeetingPrepSignalReferencePair = {
  signalLabel: string
  referenceTitle: string
  referenceId: string
  similarity: number
}

type MeetingPrepDealRow = {
  id: string
  title: string
  status: string
  linkedCount: number
  href: string
}

export type MeetingPrepSnapshot = {
  version: typeof MEETING_PREP_SNAPSHOT_VERSION
  generatedAt: string
  company: {
    id: string | null
    name: string
    logoUrl: string | null
    accountHref: string | null
  }
  deals: MeetingPrepDealRow[]
  signals: MeetingPrepSignalRow[]
  newsRisks: MeetingPrepNewsRiskRow[]
  references: MeetingPrepReferenceRow[]
  signalReferencePairs: MeetingPrepSignalReferencePair[]
  talkingPoints: string[]
}

export type CompanySearchHit = {
  id: string
  name: string
  logoUrl: string | null
}

const RISK_NEWS_RE =
  /\b(risiko|krise|warnung|klage|verlust|rückgang|breach|hack|cyber|insolvenz|entlass|strafe|skandal|krise|gefährd|unsicher)\b/i

export function extractNewsRiskRows(
  news: Array<{
    id: string
    body: string
    publishedOn: string
    insightFact?: string | null
  }>,
): MeetingPrepNewsRiskRow[] {
  const rows: MeetingPrepNewsRiskRow[] = []
  for (const item of news) {
    const text = `${item.insightFact ?? ''} ${item.body}`.trim()
    if (!text || !RISK_NEWS_RE.test(text)) continue
    const headline =
      item.insightFact?.trim() ||
      (item.body.length > 100 ? `${item.body.slice(0, 97)}…` : item.body)
    rows.push({
      id: item.id,
      headline,
      detail: item.body.length > 220 ? `${item.body.slice(0, 217)}…` : item.body,
      publishedOn: item.publishedOn,
    })
    if (rows.length >= 6) break
  }
  return rows
}

export function buildTalkingPoints(input: {
  companyName: string
  hasDeals: boolean
  signals: MeetingPrepSignalRow[]
  newsRisks: MeetingPrepNewsRiskRow[]
  references: MeetingPrepReferenceRow[]
}): string[] {
  const points: string[] = []
  if (!input.hasDeals) {
    points.push(
      `Erstgespräch mit ${input.companyName} — noch kein Deal im System; Fokus auf Bedarf und Referenzstory.`,
    )
  }
  if (input.signals[0]) {
    points.push(`Aktuelles Signal: ${input.signals[0].label}`)
  }
  if (input.newsRisks[0]) {
    points.push(`News/Risiko: ${input.newsRisks[0].headline}`)
  }
  if (input.references[0]) {
    points.push(
      `Referenz einplanen: „${input.references[0].title}“ (${Math.round(input.references[0].similarity * 100)} % Match).`,
    )
  }
  if (points.length < 3 && input.signals[1]) {
    points.push(`Weiteres Signal: ${input.signals[1].label}`)
  }
  return points.slice(0, 7)
}

export function dealHref(dealId: string) {
  return ROUTES.deals.detail(dealId)
}

export function referenceHref(referenceId: string) {
  return ROUTES.references.detail(referenceId)
}

export function accountHref(companyId: string) {
  return ROUTES.accountsDetail(companyId)
}

/** Domain-Typen und leere Analyse für das Deal-Cockpit. */

import type { BenchmarkRiskAnalysis } from '@/lib/deal-desk/benchmark-risk'
import type { DealDeskExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import type { WinProbabilityBreakdown } from '@/lib/deal-desk/compute-delivery-win-probability'

type BidTeamRoleKey =
  | 'sales_lead'
  | 'solution_manager'
  | 'bid_manager'
  | 'financial_architect'

export type BidTeamAssignment = {
  role: BidTeamRoleKey
  label: string
  assigneeId: string
  assigneeName: string
}

export type DealDeskRedFlag = {
  id: string
  severity: 'critical' | 'high' | 'medium'
  title: string
  excerpt: string
  pageHint?: string
  /** Dateiname des Quell-Dokuments (Vertrag, Anhang, …). */
  sourceFileName?: string | null
  sourceDocumentId?: string | null
  markedForLegal?: boolean
}

export type DealDeskDraftRow = {
  id: string
  requirement: string
  answer: string | null
  reference?: {
    id: string
    title: string
    companyName: string
    logoUrl: string | null
    matchPercent: number
  }
}

export type DealDeskSmeTask = {
  id: string
  question: string
  category: string
  routedTo?: string
  /** Auszug aus dem RFP für die Kontext-Vorschau */
  contextExcerpt?: string
  contextPageHint?: string
}

export type DealDeskTimelineItem = {
  id: string
  title: string
  /**
   * ISO-Date aus dem Dokument, Format: YYYY-MM-DD
   * (Countdown und Kalender-Export basieren auf dem Kalendertag)
   */
  dueDate: string
  /** Uhrzeit aus dem Dokument (24h, HH:mm) — nur Anzeige, ICS bleibt ganztägig */
  dueTime?: string | null
  evidence?: string | null
}

export type DealDeskMockAnalysis = {
  documentName: string
  documentNames: string[]
  customerName: string
  winProbability: number
  /** Berechnung aus Portfolio, Capabilities, Nachweisen (kein KI-Schätzwert). */
  winProbabilityBreakdown?: WinProbabilityBreakdown
  icpFitLabel: string
  icpSummary: string
  benchmarkRisk?: BenchmarkRiskAnalysis
  executiveBriefing?: DealDeskExecutiveBriefingFields
  redFlags: DealDeskRedFlag[]
  timelineItems: DealDeskTimelineItem[]
  draftRows: DealDeskDraftRow[]
  smeTasks: DealDeskSmeTask[]
}

const BID_TEAM_ROLE_DEFS: {
  key: BidTeamRoleKey
  label: string
  description: string
}[] = [
  {
    key: 'sales_lead',
    label: 'Sales Lead',
    description: 'Verantwortlich für Kundenbeziehung und finale Go-Entscheidung.',
  },
  {
    key: 'solution_manager',
    label: 'Solution Manager',
    description: 'Baut die Gesamtlösung, architektonische Story und technische Freigabe.',
  },
  {
    key: 'bid_manager',
    label: 'Bid Manager',
    description: 'Stellt Vollständigkeit, Fristen und formale Abgabe sicher.',
  },
  {
    key: 'financial_architect',
    label: 'Financial Architect',
    description: 'Pricing, Marge, Finanzmodell und wirtschaftliche Tragfähigkeit.',
  },
]

/** Leere Analyse — kein stiller Mock im Produktivpfad. */
export function buildEmptyDealDeskAnalysis(
  fileNames: string[],
  customerName?: string | null,
  winProbability?: number | null,
): DealDeskMockAnalysis {
  const primary = fileNames[0] ?? 'RFP-Paket'
  const docLabel =
    fileNames.length === 1 ? primary : `${primary} + ${fileNames.length - 1} weitere`
  return {
    documentName: docLabel,
    documentNames: fileNames.length > 0 ? [...fileNames] : ['RFP-Paket'],
    customerName: customerName?.trim() || 'Unbekannt',
    winProbability: winProbability ?? 0,
    icpFitLabel: '—',
    icpSummary: 'Noch keine KI-Analyse verfügbar.',
    redFlags: [],
    timelineItems: [],
    draftRows: [],
    smeTasks: [],
  }
}

export const DEFAULT_BID_TEAM: BidTeamAssignment[] = BID_TEAM_ROLE_DEFS.map((r) => ({
  role: r.key,
  label: r.label,
  assigneeId: r.key === 'sales_lead' ? 'self' : '',
  assigneeName: r.key === 'sales_lead' ? '' : '',
}))

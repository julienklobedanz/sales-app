/** Domain-Typen und leere Analyse für das Deal-Cockpit. */

import type { BenchmarkRiskAnalysis } from '@/lib/deal-desk/benchmark-risk'
import type { DealDeskExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import type { WinProbabilityBreakdown } from '@/lib/deal-desk/compute-delivery-win-probability'

export type BidTeamRoleKey =
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
  dueInDays: number
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

export const DEMO_EXECUTIVE_BRIEFING: DealDeskExecutiveBriefingFields = {
  submissionDeadline: '19.06.2026',
  desiredServiceStart: '01.09.2026',
  expectedDealVolume: 'ca. 1.200.000 € TCV (Laufzeit 36 Monate)',
  bidInvestment: 'Mittel (Benötigt ca. 5 Personentage aus Presales & Cloud-Architecture)',
  projectOverviewPlain: null,
  strategicAssessment:
    'Die Ausschreibung adressiert Cloud-Migration und SAP-nahe Infrastruktur — exakt euer Kern-ICP (Enterprise IT, DACH, >500 MA). Budgetrahmen und Laufzeit passen zu drei gewonnenen Deals der letzten 18 Monate. Hauptrisiko: aggressive SLA-Pönalen und unbegrenzte Haftungsklausel; ohne Legal-Review kein GO.',
  techFocus: 'Cloud-Migration (AWS/Azure) + SAP S/4HANA Core-Schnittstellen',
  governance:
    'ISO 27001 erforderlich, zwingende Datenhaltung in der Schweiz (Finanz-Compliance)',
  economicDecisionMaker: 'Thomas Müller (CPO/CTO, Logistik-Board)',
  competition:
    'Starker Verdacht auf [Mitbewerber A] aufgrund der Formulierung in Kap. 4.2.',
  ourLeverage: 'Matcht perfekt mit den 2 internen Referenzen (Aurubis & SAP-EMEA-Case).',
  tenderProcedure: 'Digitaler Upload am 19.06., danach Shortlist-Präsentation im Juli.',
  keyTakeaways: [
    'Budget & Laufzeit passen zum ICP-Korridor',
    'Erhöhtes Risiko: Unbegrenzte Haftung',
    'Matcht mit 2 internen Referenzen',
  ],
  capabilityRisks: [
    {
      kind: 'critical',
      title: 'Unbegrenzte Haftung',
      detail:
        '„Auftragnehmer haftet unbeschränkt für direkte und indirekte Schäden, einschließlich entgangenem Gewinn."',
    },
    {
      kind: 'high',
      title: 'Pönale bei SLA-Bruch',
      detail: 'Vertragsstrafe 0,5 % des Auftragswerts pro Verzugstag, max. 25 %.',
    },
    {
      kind: 'delivery',
      title: 'Ressourcen-Engpass',
      detail:
        'Gewünschter Servicebeginn am 01.09.2026 erfordert sofortiges Ressourcen-Blocking der Cloud-SMEs für Q3.',
    },
  ],
  domainTags: [
    'Dienstleistungen',
    'EU-Ausschreibung',
    'Cloud',
    'SAP',
    'ISO 27001',
    'Datenhaltung CH',
  ],
  projectLocation: 'Zürich, CH',
  bidderRequirements: [
    'ISO/IEC 27001-Zertifizierung (gültig, inkl. Scope Cloud/SAP)',
    'Berufshaftpflicht mind. 5 Mio. EUR je Schadensfall',
    'Mindestens 2 vergleichbare Enterprise-Referenzen (DACH, >500 MA)',
    'Nachweis SAP S/4HANA-Schnittstellen-Projekte (letzte 36 Monate)',
  ],
  roleQualifications: [
    'Projektleitung: Deutsch C1, Englisch B2',
    'Cloud-Architect: AWS oder Azure Professional-Zertifizierung',
    'Security Lead: Erfahrung Finanz-Compliance (CH/EU)',
  ],
  specialConditions: [
    'Datenverarbeitung ausschließlich Schweiz / EU-EWR',
    'Mindestlohngesetz und Tarifbindung einzuhalten',
    'Rahmenvertrag 36 Monate, Option Verlängerung +12 Monate',
    'Bietergemeinschaften zulässig mit gemeinsamer Haftung',
  ],
  requiredSubmissionDocuments: [
    'Ausgefülltes Angebotsformular',
    'Preisblatt (Anlage Preis)',
    'Referenznachweise (mind. 2)',
    'ISO 27001-Zertifikat',
    'Handelsregisterauszug',
  ],
}

export const BID_TEAM_ROLE_DEFS: {
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

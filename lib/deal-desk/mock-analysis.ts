/** Demo-Daten für Deal Desk — ersetzen durch API-Pipeline bei Live-Betrieb. */

import type { BenchmarkRiskAnalysis } from '@/lib/deal-desk/benchmark-risk'
import { buildBenchmarkRiskAnalysis } from '@/lib/deal-desk/benchmark-risk'
import type { DealDeskExecutiveBriefingFields } from '@/lib/deal-desk/executive-briefing-fields'
import {
  computeDeliveryWinProbability,
  type WinProbabilityBreakdown,
} from '@/lib/deal-desk/compute-delivery-win-probability'
import type { RfpCoverageRow } from '@/lib/rfp-coverage'

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

export const MOCK_TEAM_MEMBERS = [
  { id: 'self', name: 'Du (aktueller Nutzer)' },
  { id: 'lena', name: 'Lena Hoffmann' },
  { id: 'markus', name: 'Markus Weber' },
  { id: 'sarah', name: 'Sarah Klein' },
  { id: 'tobias', name: 'Tobias Schneider' },
] as const

export const SME_ROUTE_OPTIONS = [
  { value: 'legal', label: 'An Legal routen' },
  { value: 'cto', label: 'An CTO routen' },
  { value: 'cfo', label: 'An CFO routen' },
  { value: 'security', label: 'An Security routen' },
  { value: 'delivery', label: 'An Delivery routen' },
] as const

/** Die drei ursprünglichen Demo-Red-Flags (Haftung, SLA-Pönale, Festpreis). */
export const DEMO_SAMPLE_RED_FLAGS: DealDeskRedFlag[] = [
  {
    id: 'rf-1',
    severity: 'critical',
    title: 'Unbegrenzte Haftung',
    excerpt:
      '„Auftragnehmer haftet unbeschränkt für direkte und indirekte Schäden, einschließlich entgangenem Gewinn."',
    pageHint: 'Anhang B, § 14.2',
    sourceFileName: 'Vertragsentwurf.pdf',
  },
  {
    id: 'rf-2',
    severity: 'high',
    title: 'Pönale bei SLA-Bruch',
    excerpt:
      'Vertragsstrafe 0,5 % des Auftragswerts pro Verzugstag, max. 25 % — ohne Ausschluss höherer Schäden.',
    pageHint: 'Leistungsbeschreibung Kap. 7',
    sourceFileName: 'Leistungsbeschreibung.pdf',
  },
  {
    id: 'rf-3',
    severity: 'medium',
    title: 'Festpreis ohne Change-Request-Mechanismus',
    excerpt:
      'Scope als Festpreis definiert; Change Requests nur nach schriftlicher Zustimmung innerhalb von 5 Werktagen.',
    pageHint: 'Kap. 3.4',
    sourceFileName: 'Vertragsentwurf.pdf',
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

/** Demo-/Fallback-Analyse mit den drei Beispiel-Red-Flags. */
export function buildDemoDealDeskAnalysis(fileNames: string[]): DealDeskMockAnalysis {
  const analysis = buildMockDealDeskAnalysis(fileNames)
  return {
    ...analysis,
    redFlags: DEMO_SAMPLE_RED_FLAGS.map((f) => ({ ...f })),
  }
}

export function buildMockDealDeskAnalysis(fileNames: string[]): DealDeskMockAnalysis {
  const primary = fileNames[0] ?? 'RFP-Paket'
  const docLabel =
    fileNames.length === 1 ? primary : `${primary} + ${fileNames.length - 1} weitere`
  const multiDocHint =
    fileNames.length > 1
      ? ` Querschnitt aus ${fileNames.length} Dokumenten (u. a. Leistungsbeschreibung, Eignungsmatrix, Vertragsentwurf).`
      : ''

  const draftRows: DealDeskMockAnalysis['draftRows'] = [
    {
      id: 'd-1',
      requirement:
        'Haben Sie Erfahrung mit Cloud-Migration in der Logistik (SAP S/4, Hybrid)?',
      answer:
        'Ja. Wir haben eine vergleichbare Migration bei Aurubis durchgeführt: Lift-and-Shift der Kern-Workloads, anschließend Containerisierung der Integrationslayer. Time-to-Value nach 14 Wochen für die erste produktive Umgebung.',
      reference: {
        id: 'demo-ref-aurubis',
        title: 'Cloud-Migration Aurubis',
        companyName: 'Aurubis',
        logoUrl: null,
        matchPercent: 95,
      },
    },
    {
      id: 'd-2',
      requirement: 'Beschreiben Sie Ihr Vorgehen zum Betrieb mit 99,9 % Verfügbarkeit.',
      answer: null,
      reference: {
        id: 'demo-ref-sla',
        title: 'Managed Services SLA',
        companyName: 'Intern',
        logoUrl: null,
        matchPercent: 58,
      },
    },
    {
      id: 'd-3',
      requirement: 'Nachweis ISO 27001 und Datenschutz-Konzept für Schweizer Standorte.',
      answer:
        'ISO 27001 zertifiziert; Datenresidenz EU/CH wählbar. Referenzprojekt mit vergleichbarem Compliance-Rahmen (Finanzdienstleister, CH).',
      reference: {
        id: 'demo-ref-ch',
        title: 'Compliance-Rollout Finanz CH',
        companyName: 'Helvetia FinTech',
        logoUrl: null,
        matchPercent: 72,
      },
    },
  ]

  const redFlags: DealDeskRedFlag[] = [
    ...DEMO_SAMPLE_RED_FLAGS.map((f) => ({ ...f })),
    {
      id: 'rf-4',
      severity: 'high',
      title: 'Subunternehmer-Haftung',
      excerpt:
        'Auftragnehmer haftet für Handlungen und Unterlassungen aller Subunternehmer wie für eigene.',
      pageHint: 'Vertragsentwurf § 9',
    },
    {
      id: 'rf-5',
      severity: 'medium',
      title: 'Audit-Rechte des Auftraggebers',
      excerpt:
        'Jederzeitige Prüfung von Systemen und Prozessen mit 5 Werktagen Vorlauf — ohne Kostenobergrenze.',
      pageHint: 'Anhang C',
    },
    {
      id: 'rf-6',
      severity: 'critical',
      title: 'Konventionalstrafe bei Abbruch',
      excerpt:
        'Bei vorzeitiger Beendigung 15 % des Gesamtauftragswerts als pauschale Vertragsstrafe.',
      pageHint: 'Kap. 12.1',
    },
  ]

  const requirements = draftRows.map((d) => ({
    id: d.id,
    text: d.requirement,
    category: d.id === 'd-3' ? 'Compliance' : 'Technical',
  }))

  const coverage: RfpCoverageRow[] = draftRows.map((d) => ({
    requirementId: d.id,
    requirementText: d.requirement,
    matches: d.reference
      ? [
          {
            id: d.id,
            title: d.reference.title,
            summary: null,
            industry: null,
            similarity: d.reference.matchPercent / 100,
            companyName: d.reference.companyName,
          },
        ]
      : [],
  }))

  const winProbabilityBreakdown = computeDeliveryWinProbability({
    requirements,
    coverage,
    complianceDocs: [
      {
        document_type: 'iso_27001',
        title: 'ISO 27001 Zertifikat',
        valid_until: '2030-12-31',
        file_storage_path: 'demo/iso.pdf',
      },
    ],
    redFlags: DEMO_SAMPLE_RED_FLAGS.map((f) => ({ ...f })),
  })

  return {
    documentName: docLabel,
    documentNames: fileNames,
    customerName: 'Logistik AG Schweiz',
    winProbability: winProbabilityBreakdown.finalScore,
    winProbabilityBreakdown,
    icpFitLabel: 'Starker ICP-Fit',
    icpSummary: `${DEMO_EXECUTIVE_BRIEFING.strategicAssessment ?? ''}${multiDocHint}`,
    benchmarkRisk: buildBenchmarkRiskAnalysis([
      {
        id: 'extreme_price_focus',
        evidence: 'Vergabekriterien: Preis 75 %, technisches Konzept 25 %.',
      },
      {
        id: 'aggressive_deadline',
        evidence:
          'Abgabefrist 8 Kalendertage nach Veröffentlichung bei Enterprise-Scope.',
      },
      {
        id: 'recycled_old_document',
        evidence:
          'Metadaten und Anhang verweisen auf Frist 2019 sowie Vorlage „RFP_2020_final“.',
      },
    ]),
    executiveBriefing: { ...DEMO_EXECUTIVE_BRIEFING },
    redFlags,
    timelineItems: (() => {
      return [
        {
          id: 'tl-vergabe',
          title: 'Bekanntmachung / Vergabe',
          dueDate: '2026-05-22',
          evidence: 'Ausschreibung veröffentlicht am 22.05.2026.',
        },
        {
          id: 'tl-qa',
          title: 'Q&A / Rückfragenfrist',
          dueDate: '2026-06-12',
          dueTime: '13:00',
          evidence: 'Rückfragen bis 12.06.2026, 13:00 Uhr über das Portal.',
        },
        {
          id: 'tl-meeting',
          title: 'Erstes Erörterungsgespräch',
          dueDate: '2026-06-16',
          evidence: null,
        },
        {
          id: 'tl-angebot',
          title: 'Angebotsabgabe (Deadline)',
          dueDate: '2026-06-19',
          dueTime: '17:00',
          evidence: null,
        },
        {
          id: 'tl-shortlist',
          title: 'Voraussichtlicher Shortlist-Pitch',
          dueDate: '2026-07-15',
          evidence: null,
        },
        {
          id: 'tl-vertrag',
          title: 'Geplanter Servicebeginn',
          dueDate: '2026-09-01',
          evidence: null,
        },
      ]
    })(),
    draftRows,
    smeTasks: [
      {
        id: 's-1',
        question: 'Ist die unbegrenzte Haftungsklausel verhandelbar oder Deal-Breaker?',
        category: 'Legal',
        dueInDays: 2,
        contextExcerpt:
          '„Auftragnehmer haftet unbeschränkt für direkte und indirekte Schäden, einschließlich entgangenem Gewinn."',
        contextPageHint: 'Anhang B, § 14.2',
      },
      {
        id: 's-2',
        question:
          'Können wir 99,9 % SLA mit bestehendem Managed-Services-Stack garantieren?',
        category: 'Delivery / CTO',
        dueInDays: 3,
        contextExcerpt:
          'Verfügbarkeit des Dienstes mindestens 99,9 % pro Kalendermonat; Vertragsstrafe bei Unterschreitung.',
        contextPageHint: 'Leistungsbeschreibung Kap. 7',
      },
      {
        id: 's-3',
        question: 'Festpreis-Kalkulation: Deckungsbeitrag bei 18 Monaten Laufzeit?',
        category: 'Finance',
        dueInDays: 4,
        contextExcerpt:
          'Scope als Festpreis definiert; Change Requests nur nach schriftlicher Zustimmung innerhalb von 5 Werktagen.',
        contextPageHint: 'Kap. 3.4',
      },
    ],
  }
}

export const DEFAULT_BID_TEAM: BidTeamAssignment[] = BID_TEAM_ROLE_DEFS.map((r) => ({
  role: r.key,
  label: r.label,
  assigneeId: r.key === 'sales_lead' ? 'self' : MOCK_TEAM_MEMBERS[1].id,
  assigneeName:
    r.key === 'sales_lead'
      ? MOCK_TEAM_MEMBERS[0].name
      : r.key === 'solution_manager'
        ? 'Lena Hoffmann'
        : r.key === 'bid_manager'
          ? 'Sarah Klein'
          : 'Markus Weber',
}))

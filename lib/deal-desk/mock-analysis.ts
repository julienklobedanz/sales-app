/** Demo-Daten für Deal Desk — ersetzen durch API-Pipeline bei Live-Betrieb. */

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
  markedForLegal?: boolean
}

export type DealDeskDraftRow = {
  id: string
  requirement: string
  answer: string | null
  reference?: {
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
   * (Zeitanteil ignoriert für die UI-Countdown-Berechnung)
   */
  dueDate: string
  evidence?: string | null
}

export type DealDeskMockAnalysis = {
  documentName: string
  documentNames: string[]
  customerName: string
  winProbability: number
  icpFitLabel: string
  icpSummary: string
  redFlags: DealDeskRedFlag[]
  timelineItems: DealDeskTimelineItem[]
  draftRows: DealDeskDraftRow[]
  smeTasks: DealDeskSmeTask[]
}

export const BID_TEAM_ROLE_DEFS: { key: BidTeamRoleKey; label: string; description: string }[] = [
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
  },
  {
    id: 'rf-2',
    severity: 'high',
    title: 'Pönale bei SLA-Bruch',
    excerpt: 'Vertragsstrafe 0,5 % des Auftragswerts pro Verzugstag, max. 25 % — ohne Ausschluss höherer Schäden.',
    pageHint: 'Leistungsbeschreibung Kap. 7',
  },
  {
    id: 'rf-3',
    severity: 'medium',
    title: 'Festpreis ohne Change-Request-Mechanismus',
    excerpt: 'Scope als Festpreis definiert; Change Requests nur nach schriftlicher Zustimmung innerhalb von 5 Werktagen.',
    pageHint: 'Kap. 3.4',
  },
]

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
    fileNames.length === 1
      ? primary
      : `${primary} + ${fileNames.length - 1} weitere`
  const multiDocHint =
    fileNames.length > 1
      ? ` Querschnitt aus ${fileNames.length} Dokumenten (u. a. Leistungsbeschreibung, Eignungsmatrix, Vertragsentwurf).`
      : ''
  return {
    documentName: docLabel,
    documentNames: fileNames,
    customerName: 'Logistik AG Schweiz',
    winProbability: 78,
    icpFitLabel: 'Starker ICP-Fit',
    icpSummary:
      `Die Ausschreibung adressiert Cloud-Migration und SAP-nahe Infrastruktur — exakt euer Kern-ICP (Enterprise IT, DACH, >500 MA). Budgetrahmen und Laufzeit passen zu drei gewonnenen Deals der letzten 18 Monate. Hauptrisiko: aggressive SLA-Pönalen und unbegrenzte Haftungsklausel; ohne Legal-Review kein GO.${multiDocHint}`,
    redFlags: [
      ...DEMO_SAMPLE_RED_FLAGS.map((f) => ({ ...f })),
      {
        id: 'rf-4',
        severity: 'high',
        title: 'Subunternehmer-Haftung',
        excerpt: 'Auftragnehmer haftet für Handlungen und Unterlassungen aller Subunternehmer wie für eigene.',
        pageHint: 'Vertragsentwurf § 9',
      },
      {
        id: 'rf-5',
        severity: 'medium',
        title: 'Audit-Rechte des Auftraggebers',
        excerpt: 'Jederzeitige Prüfung von Systemen und Prozessen mit 5 Werktagen Vorlauf — ohne Kostenobergrenze.',
        pageHint: 'Anhang C',
      },
      {
        id: 'rf-6',
        severity: 'critical',
        title: 'Konventionalstrafe bei Abbruch',
        excerpt: 'Bei vorzeitiger Beendigung 15 % des Gesamtauftragswerts als pauschale Vertragsstrafe.',
        pageHint: 'Kap. 12.1',
      },
    ],
    timelineItems: (() => {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const iso = (d: Date) => d.toISOString().slice(0, 10)
      const addDays = (n: number) => {
        const t = new Date(now)
        t.setDate(t.getDate() + n)
        return t
      }
      return [
        {
          id: 'tl-angebot',
          title: 'Angebotsabgabe',
          dueDate: iso(addDays(21)),
          evidence: null,
        },
        {
          id: 'tl-qa',
          title: 'Q&A / Rückfragenfrist',
          dueDate: iso(addDays(14)),
          evidence: null,
        },
        {
          id: 'tl-vertrag',
          title: 'Vertrags-/Projektstart',
          dueDate: iso(addDays(60)),
          evidence: null,
        },
      ]
    })(),
    draftRows: [
      {
        id: 'd-1',
        requirement: 'Haben Sie Erfahrung mit Cloud-Migration in der Logistik (SAP S/4, Hybrid)?',
        answer:
          'Ja. Wir haben eine vergleichbare Migration bei Aurubis durchgeführt: Lift-and-Shift der Kern-Workloads, anschließend Containerisierung der Integrationslayer. Time-to-Value nach 14 Wochen für die erste produktive Umgebung.',
        reference: {
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
      },
      {
        id: 'd-3',
        requirement: 'Nachweis ISO 27001 und Datenschutz-Konzept für Schweizer Standorte.',
        answer:
          'ISO 27001 zertifiziert; Datenresidenz EU/CH wählbar. Referenzprojekt mit vergleichbarem Compliance-Rahmen (Finanzdienstleister, CH).',
        reference: {
          title: 'Compliance-Rollout Finanz CH',
          companyName: 'Helvetia FinTech',
          logoUrl: null,
          matchPercent: 72,
        },
      },
    ],
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
        question: 'Können wir 99,9 % SLA mit bestehendem Managed-Services-Stack garantieren?',
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

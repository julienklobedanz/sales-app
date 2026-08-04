/** Demo-Daten für Referenz Inkubator — aus RFP/Account-Kontext abgeleitet. */

export type ReferenceIncubatorHarvest = {
  companyName: string
  logoUrl: string | null
  website: string
  industry: string
  headquarters: string
  employeeCount: string
  challenge: string
  solution: string
  projectIndustry: string
  projectDuration: string
  projectVolume: string
}

export type SuccessStoryKitItem = {
  id: string
  kind: 'pdf' | 'template' | 'guide'
  title: string
  subtext: string
  downloadPath?: string
}

/** Demo: Kunden-Challenges aus dem RFP (Problem, Ausgangslage, Zielbild) — keine Legal-Red-Flags. */
export const DEMO_CUSTOMER_CHALLENGE_BULLETS: string[] = [
  'Problemstellung: SAP-nahe Kernsysteme und bestehende Infrastruktur sollen in eine moderne Cloud-Landschaft (AWS/Azure) überführt werden.',
  'Ausgangslage: heterogene Legacy-Workloads, hoher Betriebsaufwand und komplexe Schnittstellen zwischen ERP und Cloud.',
  'Zielbild: skalierbarer, sicherer Betrieb mit definiertem Servicebeginn und Shortlist-Prozess nach Angebotsabgabe.',
  'Gefordert werden Migration, S/4HANA-Schnittstellen und Betrieb unter Finanz-Compliance (Datenhaltung Schweiz / EU-EWR).',
  'Der Kunde sucht einen Partner mit Enterprise-Erfahrung (DACH) und integrierter Cloud- plus SAP-Delivery-Kompetenz.',
]

export const SUCCESS_STORY_KIT: SuccessStoryKitItem[] = [
  {
    id: 'dsgvo-reference-consent',
    kind: 'pdf',
    title: 'DSGVO Vereinbarung zur namentlichen Nennung eines Ansprechpartners',
    subtext:
      'Einwilligung für Reference Calls — ausfüllbare Felder im PDF gelb markiert (White-Label mit eurem Firmennamen).',
    downloadPath: '/api/deal-desk/dsgvo-reference-consent-pdf',
  },
  {
    id: 'nda-waiver',
    kind: 'template',
    title: 'Der NDA-Waiver',
    subtext: 'Vereinbarung zur anonymisierten Nutzung sensibler Daten.',
  },
  {
    id: 'checkin-guide',
    kind: 'guide',
    title: '6-Month Check-in Script',
    subtext: 'Gesprächsleitfaden für das Go-Live Meeting zur Logo-Einholung.',
  },
]

export function buildReferenceIncubatorHarvest(
  customerName: string,
): ReferenceIncubatorHarvest {
  return {
    companyName: customerName,
    logoUrl: null,
    website: 'logistik-ag.ch',
    industry: 'Logistik & Transport',
    headquarters: 'Zürich, CH',
    employeeCount: '2.400',
    challenge:
      'Legacy-SAP-Landschaft mit fragmentierten Schnittstellen, hohen Betriebskosten und fehlender Skalierbarkeit für Echtzeit-Logistikdaten. Der RFP forderte eine risikoarme Migration ohne Unterbrechung des Tagesgeschäfts.',
    solution:
      'Phasenweise Cloud-Migration (Hybrid SAP S/4), Containerisierung der Integrationslayer und Managed Services mit 99,9 % SLA. Bid-Team lieferte Go-Live in 14 Wochen für die erste produktive Umgebung — abgestimmt mit dem strategischen Account-Board.',
    projectIndustry: 'Logistik / Supply Chain',
    projectDuration: '18 Monate (Festpreis-Rahmen)',
    projectVolume: 'CHF 2,4 Mio. (aus RFP-Kalkulation)',
  }
}

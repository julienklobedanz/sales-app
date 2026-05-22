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

export const SUCCESS_STORY_KIT = [
  {
    id: 'msa-clause',
    kind: 'pdf' as const,
    title: 'Standard-Vertragsklausel (Marketing & Referenzfreigabe)',
    subtext: 'Zum direkten Einbau in eure MSAs und Angebote.',
  },
  {
    id: 'nda-waiver',
    kind: 'template' as const,
    title: 'Der NDA-Waiver',
    subtext: 'Vereinbarung zur anonymisierten Nutzung sensibler Daten.',
  },
  {
    id: 'checkin-guide',
    kind: 'guide' as const,
    title: '6-Month Check-in Script',
    subtext: 'Gesprächsleitfaden für das Go-Live Meeting zur Logo-Einholung.',
  },
] as const

export function buildReferenceIncubatorHarvest(customerName: string): ReferenceIncubatorHarvest {
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

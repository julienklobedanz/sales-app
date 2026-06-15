/**
 * Überarbeitet die 15 Legacy-Referenzen (Seed + AT&T/Aurubis/Samsung) mit individuellen Texten.
 *
 *   npx tsx --require dotenv/config scripts/overhaul-legacy-references.ts dotenv_config_path=.env.local
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY erforderlich.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

type LegacyUpdate = {
  id: string
  title: string
  summary: string
  customer_challenge: string
  our_solution: string
  tags: string
  volume_eur?: string
  country?: string
  contract_type?: string
  incumbent_provider?: string
  competitors?: string
  project_status?: 'active' | 'completed'
}

const UPDATES: LegacyUpdate[] = [
  {
    id: 'd1944935-d2f1-4f4c-b317-5b0939f93d74',
    title: 'Global Seller Success CRM & Service-Cloud',
    summary: 'Case-Resolution-Zeit −34 %, Seller-NPS +18 Punkte, einheitliche Sicht auf 12 Mio. aktive Händler.',
    customer_challenge:
      'eBay betrieb regionale CRM- und Service-Instanzen mit unterschiedlichen Feldern und SLAs. Seller-Beschwerden zu Listings und Zahlungen wurden doppelt erfasst; Eskalationen zwischen Marketplace, Payments und Trust-Teams dauerten Tage.',
    our_solution:
      'Salesforce-basierte Global Service Cloud mit Golden Record pro Seller, Event-Streaming aus Listing- und Payment-APIs, einheitlichen Playbooks und mehrsprachigem Wissensportal für First-Level-Agenten.',
    tags: 'crm,marketplace,salesforce,seller-experience',
    volume_eur: '2500000',
    country: 'Global',
    contract_type: 'Time & Material',
    incumbent_provider: 'Capgemini',
    competitors: 'McKinsey Digital, BCG Platinion',
    project_status: 'active',
  },
  {
    id: '999d6f2b-4f8b-4d31-a48f-0d7a79c6865e',
    title: 'PIM- und E-Commerce-Datenhub für Techniksortiment',
    summary: 'Time-to-Shelf für neue SKUs von 6 Wochen auf 9 Tage, Retourenquote −11 % durch korrekte Produktdaten.',
    customer_challenge:
      'Conrad pflegte Produktdaten, Preise und Verfügbarkeiten in ERP, Shop und Marktplätzen getrennt. Inkonsistente Spezifikationen führten zu Retouren und verlängerten Kampagnenstarts im B2B- und B2C-Kanal.',
    our_solution:
      'Zentrales PIM mit automatischer Anreicherung aus Hersteller-Feeds, Validierungsregeln für technische Attribute, Event-Sync zu Shop und Marktplatz-APIs sowie Self-Service für Category Manager.',
    tags: 'pim,e-commerce,product-data,retail',
    volume_eur: '1800000',
    country: 'DACH',
    contract_type: 'SLA-Servicevertrag',
    incumbent_provider: 'T-Systems MMS',
    competitors: 'Cognizant, HCLTech',
    project_status: 'active',
  },
  {
    id: '6bb42175-63d2-468d-b599-9052c12bc9a7',
    title: 'ISO 21434 Cybersecurity für vernetzte Fahrzeugplattform',
    summary: 'TISAX- und ISO-21434-Audit ohne Major Findings; Schwachstellen-SLA für OTA-Updates unter 72 h.',
    customer_challenge:
      'Neue E/E-Architekturen und OTA-Updates erhöhten die Angriffsfläche. Security-Anforderungen nach ISO 21434 und interne BMW-Governance waren in Entwicklungsteams uneinheitlich umgesetzt.',
    our_solution:
      'Threat-Modeling-Framework, sichere CI/CD-Pipelines für Fahrzeugsoftware, zentrales Vulnerability-Management und Schulungsprogramm für 400+ Entwickler in Connected Vehicle.',
    tags: 'automotive,iso21434,cybersecurity,ota',
    volume_eur: '1200000',
    country: 'Deutschland',
    contract_type: 'Usage-Based',
    incumbent_provider: 'Infosys',
    competitors: 'NTT Data, Fujitsu',
    project_status: 'active',
  },
  {
    id: '13226968-6678-4f98-b3c2-1f46bdfae656',
    title: 'Hybride Cloud für Molkerei-ERP und Qualitätslabore',
    summary: 'Lab-Daten synchron in unter 5 Minuten; Betriebskosten Rechenzentrum −22 % im ersten Jahr.',
    customer_challenge:
      'Arla betrieb SAP und Laborsysteme on-prem mit nächtlichen Batch-Jobs. Qualitätsdaten aus Molkereien erreichten das Zentrallager oft erst am Folgetag — kritisch bei Frischeprodukten.',
    our_solution:
      'Azure Landing Zone, Lift-and-Shift für SAP-Komponenten, Echtzeit-Integration von Laborgeräten per Event Hub und Disaster-Recovery zwischen DK und DE.',
    tags: 'cloud,sap,dairy,hybrid',
    volume_eur: '800000',
    country: 'Nordeuropa',
    contract_type: 'SLA-Servicevertrag',
    incumbent_provider: 'T-Systems MMS',
    competitors: 'Cognizant, HCLTech',
    project_status: 'active',
  },
  {
    id: 'cb308f9b-e101-409a-91a9-3bb345b38376',
    title: 'Supply-Chain-Control-Tower auf SAP IBP',
    summary: 'Forecast-Genauigkeit +9 PP, Stockouts in Launch-Quartalen −31 %.',
    customer_challenge:
      'Apples globale Supply Chain nutzte fragmentierte Planungsmodelle; Chip-Engpässe und Launch-Spitzen führten zu teuren Express-Logistik-Entscheidungen ohne einheitliche What-if-Simulation.',
    our_solution:
      'SAP IBP Control Tower mit Szenario-Planung, Integration von Lieferanten-Forecasts, Alerts bei Kapazitätsengpässen und Executive-Dashboards für EMEA-Operations.',
    tags: 'sap,ibp,supply-chain,planning',
    volume_eur: '5000000',
    country: 'EMEA',
    contract_type: 'Andere',
    incumbent_provider: 'HCLTech',
    competitors: 'Infosys, Tech Mahindra',
    project_status: 'active',
  },
  {
    id: 'b57d2a03-3ae2-4601-97d7-6e57135e4cb4',
    title: 'Smart-Building-IoT für Microsoft Campus',
    summary: 'Energieverbrauch Gebäude −14 %, Raumbelegung optimal genutzt, 2.400 Sensoren live.',
    customer_challenge:
      'HVAC, Beleuchtung und Raumbooking liefen auf getrennten Systemen. Facility-Teams hatten keine Echtzeit-Transparenz über Belegung und Energieverbrauch auf dem Redmond-Campus.',
    our_solution:
      'Azure IoT Hub, digitale Zwillinge pro Gebäudeflügel, ML-basierte HVAC-Optimierung und Integration in Microsoft Places für Buchung und Wayfinding.',
    tags: 'iot,smart-building,azure,facility',
    volume_eur: '3000000',
    country: 'USA',
    contract_type: 'SLA-Servicevertrag',
    incumbent_provider: 'T-Systems MMS',
    competitors: 'Cognizant, HCLTech',
    project_status: 'active',
  },
  {
    id: 'afe04740-a19a-4e88-8562-2d3d7b3c983e',
    title: 'Managed XDR für DACH-Mittelstandskunden',
    summary: 'MTTR sicherheitsrelevanter Events −48 %, 120 Kunden auf gemeinsamer SOC-Plattform.',
    customer_challenge:
      'Fujitsu betrieb für Mittelstandskunden heterogene SIEM-Lösungen mit unterschiedlichen Playbooks. Analysten verloren Zeit bei False Positives; Reporting für ISO 27001 war manuell.',
    our_solution:
      'Zentrales XDR mit MITRE-ATT&CK-Mapping, automatisiertem Triage, Kundenportale mit SLA-Reports und 24/7-SOC in Frankfurt mit dedizierten Runbooks pro Branche.',
    tags: 'xdr,soc,security,managed-services',
    volume_eur: '1200000',
    country: 'DACH',
    contract_type: 'Andere',
    incumbent_provider: 'HCLTech',
    competitors: 'Infosys, Tech Mahindra',
    project_status: 'active',
  },
  {
    id: '367f45b9-78cd-49ad-8d86-0599877d7522',
    title: 'Checkout- und Payments-Modernisierung',
    summary: 'Payment Success Rate +2,3 PP, PCI-Audit ohne Findings, Rollout in 14 Märkten.',
    customer_challenge:
      'eBays Legacy-Checkout unterstützte neue Payment-Methoden und Buy-now-pay-later nur mit langen Release-Zyklen. Mobile Conversion lag unter Wettbewerbern.',
    our_solution:
      'Microservices-Checkout, tokenisierte Zahlungsflows, A/B-Testing-Framework und schrittweise Migration ohne Big-Bang pro Markt.',
    tags: 'payments,checkout,fintech,e-commerce',
    volume_eur: '5000000',
    country: 'Global',
    contract_type: 'Full Managed',
    incumbent_provider: 'NTT Data',
    competitors: 'Wipro, Publicis Sapient',
    project_status: 'completed',
  },
  {
    id: 'e26a6530-6a47-4adf-acb1-2b1c360b58be',
    title: 'RFID-Regalbestand im Technik-Fachmarkt',
    summary: 'Inventurdifferenz −62 %, Omnichannel-Verfügbarkeit +15 PP an Top-100-Standorten.',
    customer_challenge:
      'Conrad erfasste Regalbestände manuell und unterschiedlich je Filiale. Online-Kunden sahen „verfügbar“, obwohl das Produkt im Regal fehlte — besonders bei Kleinteilen.',
    our_solution:
      'RFID an Regalen und Pick-Zonen, Echtzeit-Sync zum OMS, Associate-App mit Nachfüll-Alerts und Integration in Click&Collect-Reservierungen.',
    tags: 'rfid,retail,inventory,omnichannel',
    volume_eur: '3000000',
    country: 'DACH',
    contract_type: 'Usage-Based',
    incumbent_provider: 'Infosys',
    competitors: 'NTT Data, Fujitsu',
    project_status: 'active',
  },
  {
    id: '055c9f22-ef66-4593-9993-20eafd3c1eb5',
    title: 'Connected-Drive Upselling CRM für Händlernetz',
    summary: 'Service-Umsatz pro VIN +12 %, Kampagnen-Conversion für Software-Upgrades verdoppelt.',
    customer_challenge:
      'BMW-Händler nutzten unterschiedliche CRM-Tools für Service, Teile und digitale Upsell-Angebote (ConnectedDrive). Kundenhistorie war nicht kanalübergreifend sichtbar.',
    our_solution:
      'Zentrales Dealer-CRM mit 360°-Fahrzeugsicht, automatischen Upgrade-Angeboten aus Telemetrie-Consent-Daten und Kampagnen-Workflows für Aftersales.',
    tags: 'crm,automotive,connected-car,dealer',
    volume_eur: '2500000',
    country: 'Europa',
    contract_type: 'Festpreis',
    incumbent_provider: 'Accenture',
    competitors: 'Atos, BearingPoint',
    project_status: 'completed',
  },
  {
    id: 'fa13fca0-fae1-4411-8b9f-9379f7237bea',
    title: 'Milchqualitäts-Analytics für Lieferantennetzwerk',
    summary: 'Abweichungen bei Rohmilch 48 h früher erkannt, Ausschuss −19 % in Pilotregion.',
    customer_challenge:
      'Qualitätsdaten von 1.200 Milchlieferanten kamen in unterschiedlichen Formaten. Abweichungen bei Fett- und Keimwerten wurden oft erst bei Anlieferung im Werk erkannt.',
    our_solution:
      'Lakehouse mit standardisierten Lieferanten-Feeds, ML-Anomalieerkennung, Dashboards für Field Teams und automatische Sperrlogik bei Grenzwertverletzungen.',
    tags: 'analytics,dairy,quality,supplier',
    volume_eur: '1800000',
    country: 'Nordeuropa',
    contract_type: 'Full Managed',
    incumbent_provider: 'NTT Data',
    competitors: 'Wipro, Cognizant',
    project_status: 'completed',
  },
  {
    id: '7fe741f6-6e63-4778-8363-e936c9a52634',
    title: 'Zero-Trust für globales Endpoint- und Secrets-Management',
    summary: 'Phishing-Resilience-Score +40 %, Secrets-Rotation vollständig automatisiert.',
    customer_challenge:
      'Apples globale Workforce und Entwickler-Teams nutzten heterogene VPN- und Secrets-Prozesse. Insider-Risiko und Credential-Leaks waren ein Board-Thema.',
    our_solution:
      'Zero-Trust Network Access, Hardware-Key-Pflicht für privilegierte Zugriffe, zentrales Secrets-Management mit automatischer Rotation und kontinuierlichem Device-Posture-Check.',
    tags: 'zero-trust,endpoint,secrets,identity',
    volume_eur: '1200000',
    country: 'Global',
    contract_type: 'Full Managed',
    incumbent_provider: 'NTT Data',
    competitors: 'Wipro, CrowdStrike Services',
    project_status: 'completed',
  },
  {
    id: 'f18daa7f-419b-4865-a136-8463762132e3',
    title: 'Open-RAN-Modernisierung des Mobilfunknetzes',
    summary: 'Spectral Efficiency +18 %, Energiekosten je Site −11 %, 1.200 RAN-Sites migriert.',
    customer_challenge:
      'AT&T musste Kapazität für exponentiell wachsende Mobilfunkdaten schaffen, gleichzeitig Energiekosten (15–20 % der OPEX) senken und auf Open RAN / Cloud RAN umstellen — bei maximaler Netzverfügbarkeit.',
    our_solution:
      'Schrittweise Open-RAN-Einführung, Cloud-native RAN-Steuerung, KI-basiertes Energiemanagement pro Cell und vereinheitlichte Lieferanten-Logistik für 3,4 Mio. Hardware-Einheiten jährlich.',
    tags: '5g,open-ran,telecom,network',
    volume_eur: '20000000',
    country: 'USA',
    contract_type: 'Festpreis',
    incumbent_provider: 'Ericsson',
    competitors: 'Nokia, Samsung Networks',
    project_status: 'completed',
  },
  {
    id: 'be75fbaf-7d72-49c3-a55c-40892d04ffc0',
    title: 'Managed IT & Cloud für Kupferproduktion',
    summary: 'Verfügbarkeit Produktions-IT 99,95 %, Incident-Volume −28 %, ein Ansprechpartner für 14 Werke.',
    customer_challenge:
      'Aurubis betrieb Werks-IT und Cloud-Ressourcen dezentral. Patch- und Backup-Standards wichen zwischen Hamburg, Bulgaria und USA ab; SAP- und MES-Schnittstellen waren fragil.',
    our_solution:
      'Full Managed Service für Workplace, SAP-Basis und Azure-Workloads, einheitliches Monitoring, 24/7-Support-Desk und quartalsweise Business-Reviews mit Werksleitern.',
    tags: 'managed-service,manufacturing,sap,azure',
    volume_eur: '4500000',
    country: 'Europa',
    contract_type: 'Full Managed',
    incumbent_provider: 'T-Systems',
    competitors: 'Atos, DXC Technology',
    project_status: 'active',
  },
  {
    id: 'afc6786f-8a60-4d11-ac01-cb19d3e93d4b',
    title: 'SOC-Transformation und Threat-Hunting-Factory',
    summary: 'Alert-Noise −55 %, Mean Time to Detect −41 %, SOC-Team von L1-Reaktion auf Hunting umgestellt.',
    customer_challenge:
      'Samsungs SOC arbeitete reaktiv mit hohem Alert-Volumen aus Legacy-SIEM. Threat-Hunting war nur ad hoc möglich; Playbooks für Consumer Electronics und B2B-IT waren nicht vereinheitlicht.',
    our_solution:
      'SOC-Operating-Model-Neuaufstellung, SOAR-Automatisierung, dediziertes Hunting-Team mit MITRE-Fokus und Integration von OT-Alerts aus Fabriken in Korea und EU.',
    tags: 'soc,soar,threat-hunting,security',
    volume_eur: '3200000',
    country: 'Global',
    contract_type: 'Rahmenvertrag',
    incumbent_provider: 'IBM Security',
    competitors: 'Palo Alto Networks, Mandiant',
    project_status: 'active',
  },
]

async function main() {
  console.log(`Überarbeite ${UPDATES.length} Legacy-Referenzen…\n`)

  for (const u of UPDATES) {
    const { error } = await supabase
      .from('references')
      .update({
        title: u.title,
        summary: u.summary,
        customer_challenge: u.customer_challenge,
        our_solution: u.our_solution,
        tags: u.tags,
        volume_eur: u.volume_eur,
        country: u.country,
        contract_type: u.contract_type,
        incumbent_provider: u.incumbent_provider,
        competitors: u.competitors,
        project_status: u.project_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', u.id)

    if (error) {
      throw new Error(`${u.id} (${u.title}): ${error.message}`)
    }
    console.log(`✓ ${u.title}`)
  }

  console.log('\nStarte Embedding-Reindex für überarbeitete Referenzen…')
  const { execSync } = await import('child_process')
  execSync(
    'REINDEX_IDS=' +
      UPDATES.map((u) => u.id).join(',') +
      ' npx tsx --require dotenv/config scripts/backfill-embeddings.ts dotenv_config_path=.env.local',
    { stdio: 'inherit', cwd: process.cwd(), env: process.env }
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

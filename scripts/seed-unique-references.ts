/**
 * Einmaliges Seed-Script: 20 individuelle Referenzen in den Demo-Workspace.
 *
 * Ausführung:
 *   npx ts-node --require dotenv/config scripts/seed-unique-references.ts dotenv_config_path=.env.local
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY erforderlich.')
  process.exit(1)
}

const ORG_ID = '3439c54a-93f9-428e-9ee3-cf61739805b4'
const CREATED_BY = 'e9f31c6a-a436-4f19-b0a8-24c5c790419d' // Mara Account Manager

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

type RefSeed = {
  companyName: string
  companyIndustry?: string
  title: string
  summary: string
  industry: string
  country: string
  volume_eur: string
  contract_type: string
  status: 'draft' | 'approved' | 'internal_only'
  tags: string
  incumbent_provider: string
  competitors: string
  customer_challenge: string
  our_solution: string
  project_status: 'active' | 'completed'
  project_start: string
  project_end: string | null
}

const REFERENCES: RefSeed[] = [
  {
    companyName: 'BioNTech SE',
    title: 'Validierter GxP-Cloud-Umzug für klinische Studien',
    summary:
      'Go-Live in 11 Monaten; Audit-Findings von 14 auf 2 reduziert; Studienstart um durchschnittlich 3 Wochen beschleunigt.',
    industry: 'health',
    country: 'Deutschland',
    volume_eur: '4200000',
    contract_type: 'Festpreis',
    status: 'approved',
    tags: 'gxp,clinical-trials,aws,validation',
    incumbent_provider: 'IBM Consulting',
    competitors: 'Accenture, Cognizant',
    customer_challenge:
      'Studiendaten lagen in drei Legacy-Rechenzentren mit unterschiedlichen Audit-Trails. Jede Änderung an Analyse-Pipelines erforderte manuelle CSV-Exports und 6-wöchige Validierungszyklen.',
    our_solution:
      'GxP-konforme Landing Zone mit elektronischen Signaturen, automatisierten IQ/OQ/PQ-Paketen und versionierten ETL-Pipelines für Phase-II/III-Studiendaten.',
    project_status: 'completed',
    project_start: '2023-04-01',
    project_end: '2024-03-15',
  },
  {
    companyName: 'Commerzbank',
    companyIndustry: 'fin',
    title: 'Echtzeit-Betrugserkennung im Instant-Payment-Hub',
    summary:
      'False-Positive-Rate −38 %, Betrugsverluste −22 % im ersten Jahr, Latenz unter 200 ms.',
    industry: 'fin',
    country: 'Deutschland',
    volume_eur: '2800000',
    contract_type: 'SLA-Servicevertrag',
    status: 'approved',
    tags: 'fraud,sepa-instant,ml,pci',
    incumbent_provider: 'FIS Global',
    competitors: 'Temenos, Finastra',
    customer_challenge:
      'SEPA-Instant-Zahlungen überstiegen 40 % des Volumens, aber Regelwerke basierten noch auf Batch-Scoring mit 15-Minuten-Latenz.',
    our_solution:
      'Streaming-Risk-Engine mit Graph-Anomalieerkennung, Echtzeit-Blocklisten und erklärbaren Modellen für Compliance-Reviews.',
    project_status: 'active',
    project_start: '2024-06-01',
    project_end: null,
  },
  {
    companyName: 'Lufthansa Technik',
    companyIndustry: 'log',
    title: 'Predictive Maintenance für Flugzeug-Triebwerke',
    summary:
      'Ungeplante Stillstände −27 %, Ersatzteil-Lagerbestand −15 %, ROI nach 14 Monaten.',
    industry: 'log',
    country: 'EMEA',
    volume_eur: '6500000',
    contract_type: 'Rahmenvertrag',
    status: 'approved',
    tags: 'mro,predictive-maintenance,iot,aviation',
    incumbent_provider: 'SAP',
    competitors: 'GE Aerospace Digital, Honeywell Forge',
    customer_challenge:
      'Ungeplante AOG-Events kosteten im Schnitt 180.000 € pro Vorfall; Sensordaten aus Werkstätten weltweit waren nicht vereinheitlicht.',
    our_solution:
      'Zentrale Telemetrie-Plattform, digitale Zwillinge pro Engine-Serial, ML-Modelle für Verschleißprognosen und Integration ins MRO-ERP.',
    project_status: 'active',
    project_start: '2023-09-01',
    project_end: null,
  },
  {
    companyName: 'Stadt München',
    companyIndustry: 'pub',
    title: 'Smart-City-Verkehrssteuerung mit adaptiven Ampeln',
    summary:
      'Durchschnittliche Wartezeit −18 %, CO₂ an Hauptachsen −9 %, Pilot auf 35 Kreuzungen ausgerollt.',
    industry: 'pub',
    country: 'Deutschland',
    volume_eur: '1950000',
    contract_type: 'Time & Material',
    status: 'approved',
    tags: 'smart-city,traffic,edge,computer-vision',
    incumbent_provider: 'Siemens Mobility',
    competitors: 'Yunex Traffic, Kapsch',
    customer_challenge:
      '120 Kreuzungen hatten starre Schaltpläne; Staus in Randbezirken wuchsen trotz sinkendem Innenstadtverkehr.',
    our_solution:
      'Edge-Kameras + Fahrzeugzählung, federated ML für Ampelphasen, Dashboard für Verkehrsleitstelle mit What-if-Simulationen.',
    project_status: 'active',
    project_start: '2024-01-15',
    project_end: null,
  },
  {
    companyName: 'Allianz Versicherung',
    companyIndustry: 'fin',
    title: 'Schadensbearbeitung mit dokumentenverstehendem GenAI',
    summary:
      'Durchlaufzeit −45 %, manuelle Erfassung −70 %, keine erhöhte Klagequote im Pilot.',
    industry: 'fin',
    country: 'DACH',
    volume_eur: '3100000',
    contract_type: 'Subscription (Per User/Tiered)',
    status: 'internal_only',
    tags: 'genai,claims,document-ai,gdpr',
    incumbent_provider: 'Guidewire',
    competitors: 'Shift Technology, Sprout.ai',
    customer_challenge:
      '62 % der Kfz-Schäden kamen mit unstrukturierten Fotos und handschriftlichen Gutachten; Sachbearbeiter verbrachten 40 % der Zeit mit Datenerfassung.',
    our_solution:
      'RAG-basierte Schadensklassifikation, automatische Deckungsprüfung, Human-in-the-Loop für Grenzfälle, vollständiges Prompt-/Model-Audit-Log.',
    project_status: 'active',
    project_start: '2024-03-01',
    project_end: null,
  },
  {
    companyName: 'BMW',
    title: 'Batterie-Rückverfolgbarkeit entlang der EV-Wertschöpfungskette',
    summary:
      '94 % der Lieferanten onboarded, Audit-Vorbereitungszeit von 6 Wochen auf 4 Tage.',
    industry: 'man',
    country: 'Europa',
    volume_eur: '5400000',
    contract_type: 'Festpreis',
    status: 'draft',
    tags: 'battery-passport,traceability,sustainability,eu-regulation',
    incumbent_provider: 'Capgemini',
    competitors: 'Deloitte, PwC Advisory',
    customer_challenge:
      'EU-Battery-Regulation verlangt lückenlose Herkunftsnachweise von Rohstoff bis Recycling; Lieferanten nutzten inkompatible Formate.',
    our_solution:
      'Blockchain-light Traceability Ledger, Supplier-Portal, automatische CO₂-Footprint-Berechnung pro Zell-Batch.',
    project_status: 'active',
    project_start: '2024-05-01',
    project_end: null,
  },
  {
    companyName: 'RWE',
    title: 'Lastmanagement für Wind- und Solar-Feed-in',
    summary:
      'Prognosefehler −31 %, Redispatch-Kosten −12 Mio € p.a., Integration in bestehendes SCADA.',
    industry: 'energy',
    country: 'Deutschland',
    volume_eur: '7200000',
    contract_type: 'Usage-Based',
    status: 'approved',
    tags: 'renewables,grid,forecasting,scada',
    incumbent_provider: 'ABB',
    competitors: 'Schneider Electric, Hitachi Energy',
    customer_challenge:
      'Volatile Erzeugung führte zu Redispatch-Kosten; Prognosen für 48h-Fenster wichen um bis zu 18 % ab.',
    our_solution:
      'Ensemble-Forecasting (Wetter + Historie + Marktpreise), automatische Flexibilitätssteuerung für Speicher und industrielle Abnehmer.',
    project_status: 'active',
    project_start: '2023-11-01',
    project_end: null,
  },
  {
    companyName: 'TU München',
    companyIndustry: 'pub',
    title: 'Hybride Lernplattform für 28.000 Studierende',
    summary:
      'Tool-Anzahl von 5 auf 1, NPS Studierende +24 Punkte, WCAG-2.1-AA-Zertifizierung erreicht.',
    industry: 'pub',
    country: 'Deutschland',
    volume_eur: '980000',
    contract_type: 'Rahmenvertrag',
    status: 'approved',
    tags: 'lms,hybrid-learning,accessibility,video',
    incumbent_provider: 'Moodle Hosting Partner',
    competitors: 'Canvas, Blackboard',
    customer_challenge:
      'Vorlesungsaufzeichnungen, Prüfungen und Gruppenarbeit liefen über 5 getrennte Tools; Barrierefreiheit war nicht durchgängig umgesetzt.',
    our_solution:
      'Einheitliches LMS mit Auto-Transkription, proctoring-fähigen Online-Prüfungen und SCORM-Import alter Kurse.',
    project_status: 'completed',
    project_start: '2022-08-01',
    project_end: '2024-02-28',
  },
  {
    companyName: 'Lidl US',
    title: 'Omnichannel-Bestandsabgleich für 400 Filialen',
    summary: 'BOPIS-Fehlerquote auf 1,8 %, Umsatz Click&Collect +19 %.',
    industry: 'ret',
    country: 'USA',
    volume_eur: '2400000',
    contract_type: 'Full Managed',
    status: 'approved',
    tags: 'omnichannel,inventory,pos,real-time',
    incumbent_provider: 'Oracle Retail',
    competitors: 'Blue Yonder, RELEX',
    customer_challenge:
      'Online-Bestellungen mit Abholung im Store scheiterten in 11 % der Fälle wegen veralteter Lagerbestände.',
    our_solution:
      'Event-getriebener Bestandsabgleich Store↔Zentrallager, Reservierungs-API für E-Commerce, Store-Associate-App mit Echtzeit-Alerts.',
    project_status: 'active',
    project_start: '2024-02-01',
    project_end: null,
  },
  {
    companyName: 'BASF Ludwigshafen',
    companyIndustry: 'health',
    title: 'OT/IT-Segmentierung in Spezialchemie-Anlage',
    summary:
      '100 % OT-Asset-Inventar, kritische Lateral-Movement-Pfade eliminiert, TÜV-Sicherheitsaudit bestanden.',
    industry: 'health',
    country: 'Deutschland',
    volume_eur: '3600000',
    contract_type: 'Festpreis',
    status: 'internal_only',
    tags: 'ot-security,iec62443,segmentation,chemical',
    incumbent_provider: 'Fortinet',
    competitors: 'Claroty, Nozomi Networks',
    customer_challenge:
      '1.200 veraltete SPS-Controller ohne Patches; flache Netzwerkstruktur erhöhte Ransomware-Risiko in Produktionslinien.',
    our_solution:
      'Passive OT-Asset-Discovery, Mikrosegmentierung, Jump-Host-Konzept für Wartung, IEC-62443-konformes Monitoring.',
    project_status: 'completed',
    project_start: '2023-01-10',
    project_end: '2024-06-30',
  },
  {
    companyName: 'Marriott EMEA',
    companyIndustry: 'log',
    title: 'Gästeprofil-CRM für Premium-Hotelgruppe',
    summary: 'Wiederkehrrate +8 %, RevPAR Premium-Segment +6 %.',
    industry: 'log',
    country: 'EMEA',
    volume_eur: '1650000',
    contract_type: 'Subscription (Per User/Tiered)',
    status: 'draft',
    tags: 'hospitality,crm,loyalty,personalization',
    incumbent_provider: 'Salesforce Hospitality Cloud',
    competitors: 'Amadeus, Shiji',
    customer_challenge:
      'Stammgäste wurden in 14 Properties unterschiedlich erfasst; Präferenzen (Zimmer, Allergien) gingen bei Chain-Wechseln verloren.',
    our_solution:
      'Golden-Record-MDM für Gäste, Event-Streaming aus PMS/Spa/POS, Next-Best-Offer für Upselling am Check-in.',
    project_status: 'active',
    project_start: '2024-04-01',
    project_end: null,
  },
  {
    companyName: 'KION Group',
    title: 'Kühlketten-Monitoring für Pharma-Logistik',
    summary:
      'Produktverluste −41 %, GDP-Audit ohne Findings, Alarm-Reaktionszeit von 4h auf 12 min.',
    industry: 'log',
    country: 'Europa',
    volume_eur: '1200000',
    contract_type: 'SLA-Servicevertrag',
    status: 'approved',
    tags: 'cold-chain,iot,gdp,logistics',
    incumbent_provider: 'DHL Supply Chain IT',
    competitors: 'Maersk Cold Chain, FedEx SenseAware',
    customer_challenge:
      'Temperaturabweichungen wurden erst bei Ankunft im Lager erkannt; GDP-konforme Nachweise waren manuell.',
    our_solution:
      'IoT-Sensoren in 800 Kühlcontainern, Echtzeit-Alerts, automatische GDP-Protokolle und Blockchain-light Unveränderbarkeitsnachweis.',
    project_status: 'active',
    project_start: '2023-07-01',
    project_end: null,
  },
  {
    companyName: 'DAZN',
    companyIndustry: 'media',
    title: 'CDN-Optimierung für Sport-Streaming-Peaks',
    summary:
      'Buffering bei Peak-Events auf 0,9 %, CDN-Kosten −17 % durch intelligentes Routing.',
    industry: 'media',
    country: 'Europa',
    volume_eur: '4800000',
    contract_type: 'Usage-Based',
    status: 'approved',
    tags: 'cdn,streaming,live-sports,edge',
    incumbent_provider: 'Akamai',
    competitors: 'Cloudflare, Fastly',
    customer_challenge:
      'Champions-League-Finale verursachte 12× normalen Traffic; Buffering-Rate stieg auf 8 % in Südeuropa.',
    our_solution:
      'Multi-CDN-Orchestrierung, predictive pre-warming an Edge-PoPs, adaptive Bitrate-Tuning pro Region und Device-Klasse.',
    project_status: 'completed',
    project_start: '2023-02-01',
    project_end: '2024-05-31',
  },
  {
    companyName: 'Hochtief',
    companyIndustry: 'prop',
    title: 'Digital Twin für Hochhaus-Neubau (BIM → Betrieb)',
    summary:
      'Übergabezeit −30 %, Wartungskosten Jahr 1 −14 %, 3.400 Assets digital erfasst.',
    industry: 'prop',
    country: 'Deutschland',
    volume_eur: '2100000',
    contract_type: 'Festpreis',
    status: 'draft',
    tags: 'bim,digital-twin,construction,facilities',
    incumbent_provider: 'Autodesk Construction Cloud',
    competitors: 'Bentley iTwin, Procore',
    customer_challenge:
      'BIM-Modelle aus Planungsphase wurden nach Übergabe nicht in FM-Systeme überführt; Wartung lief noch papierbasiert.',
    our_solution:
      'IFC-zu-Digital-Twin-Pipeline, Sensorintegration HVAC/Aufzug, AR-Wartungsanleitungen für Facility-Teams.',
    project_status: 'active',
    project_start: '2024-01-01',
    project_end: null,
  },
  {
    companyName: 'Siemens',
    title: 'Private 5G-Campusnetz für Smart Factory Amberg',
    summary:
      'AGV-Verfügbarkeit 99,7 %, Cobot-Latenz median 8 ms, 12 Produktionslinien angebunden.',
    industry: 'man',
    country: 'Deutschland',
    volume_eur: '8900000',
    contract_type: 'Full Managed',
    status: 'approved',
    tags: 'private-5g,industry-4.0,edge,wlan-replacement',
    incumbent_provider: 'Ericsson',
    competitors: 'Nokia DAC, Huawei Enterprise',
    customer_challenge:
      'WLAN-Störungen durch Metallmaschinen führten zu AGV-Ausfällen; Latenzanforderungen für Cobots unterschritten 20 ms nicht zuverlässig.',
    our_solution:
      'Private 5G SA mit Network Slicing, Edge-MEC für Robotik-Steuerung, zentrales SLA-Dashboard.',
    project_status: 'active',
    project_start: '2023-05-15',
    project_end: null,
  },
  {
    companyName: 'Arla',
    title: 'Rückruf-Management für Lebensmittelkette',
    summary:
      'Recall-Zeit von 72h auf 4h, betroffene Paletten präzise auf 0,3 % der ursprünglichen Schätzung reduziert.',
    industry: 'ret',
    country: 'Nordeuropa',
    volume_eur: '890000',
    contract_type: 'Stundenkontingent',
    status: 'approved',
    tags: 'recall,traceability,food-safety,fsm',
    incumbent_provider: 'SAP FSM',
    competitors: 'FoodLogiQ, TraceGains',
    customer_challenge:
      'Lot-Tracking über Molkereien und Logistikpartner dauerte bei Verdachtsfällen 72+ Stunden.',
    our_solution:
      'Einheitliche Chargen-ID über ERP↔Transport↔Retail-Scanner, Simulations-Tool für Recall-Szenarien, automatische Händler-Benachrichtigung.',
    project_status: 'completed',
    project_start: '2022-11-01',
    project_end: '2024-01-31',
  },
  {
    companyName: 'Allianz Global Investors',
    companyIndustry: 'fin',
    title: 'ESG-Reporting-Datenmesh für Pensionsfonds',
    summary:
      'Reporting-Zyklus von 9 auf 3 Wochen, Datenabdeckung Scope 3 von 45 % auf 88 %.',
    industry: 'fin',
    country: 'EMEA',
    volume_eur: '2600000',
    contract_type: 'Rahmenvertrag',
    status: 'internal_only',
    tags: 'esg,csrd,data-mesh,reporting',
    incumbent_provider: 'MSCI ESG Manager',
    competitors: 'Sustainalytics, Clarity AI',
    customer_challenge:
      'CSRD-Pflicht erforderte Scope-3-Daten von 200 Portfoliounternehmen in heterogenen Formaten.',
    our_solution:
      'Domänenorientiertes Data Mesh, Self-Service-ESG-Produkte, automatische Plausibilitätsprüfungen und Audit-Trail für Investorenberichte.',
    project_status: 'active',
    project_start: '2024-02-01',
    project_end: null,
  },
  {
    companyName: 'Fraport',
    companyIndustry: 'log',
    title: 'Passagierfluss-Analyse am Drehkreuz-Flughafen',
    summary: 'Security-Wartezeit P95 −24 %, Gate-Conflict-Events −35 %.',
    industry: 'log',
    country: 'Deutschland',
    volume_eur: '3300000',
    contract_type: 'Time & Material',
    status: 'approved',
    tags: 'airport,passenger-flow,analytics,security',
    incumbent_provider: 'SITA',
    competitors: 'Amadeus Airport IT, Vanderlande',
    customer_challenge:
      'Security-Wartezeiten schwankten stark; Gate-Umplanungen basierten auf Bauchgefühl statt Live-Daten.',
    our_solution:
      'LiDAR + anonymisierte Videoanalyse, Predictive Queueing, Integration in AODB und Gate-Displays.',
    project_status: 'active',
    project_start: '2023-10-01',
    project_end: null,
  },
  {
    companyName: 'Charité Berlin',
    companyIndustry: 'health',
    title: 'KI-gestützter Radiologie-Workflow im Klinikverbund',
    summary:
      'Turnaround kritischer Befunde −52 %, Radiologen-Zufriedenheit +31 NPS-Punkte.',
    industry: 'health',
    country: 'Deutschland',
    volume_eur: '1750000',
    contract_type: 'SLA-Servicevertrag',
    status: 'approved',
    tags: 'radiology,ai,pacs,clinical-workflow',
    incumbent_provider: 'Philips PACS',
    competitors: 'Siemens Healthineers, Aidoc',
    customer_challenge:
      'Radiologen bearbeiteten 40 % mehr CT/MRT-Volumen bei gleichbleibender Personalstärke; kritische Befunde verzögerten sich in Nachtschichten.',
    our_solution:
      'KI-Triage für Lungenembolie/ICH, Worklist-Priorisierung, strukturierte Befundvorlagen, DICOM-Integration ohne PACS-Wechsel.',
    project_status: 'active',
    project_start: '2024-01-01',
    project_end: null,
  },
  {
    companyName: 'Hugo Boss',
    title: 'B2B-Marktplatz-Modernisierung für Industriezulieferer',
    summary: 'Onboarding-Zeit von 6 Wochen auf 5 Tage, Zertifikatsfehler −63 %.',
    industry: 'ret',
    country: 'Global',
    volume_eur: '1450000',
    contract_type: 'Festpreis',
    status: 'draft',
    tags: 'b2b-portal,supplier-onboarding,plm,sustainability',
    incumbent_provider: 'SAP Ariba',
    competitors: 'Coupa, Jaggaer',
    customer_challenge:
      '1.800 Textillieferanten nutzten veraltetes Portal; Nachhaltigkeitsnachweise (GOTS, ZDHC) wurden per E-Mail eingereicht.',
    our_solution:
      'Headless B2B-Portal, Self-Service-Onboarding, PLM-Anbindung für Materialzertifikate, automatische Compliance-Scoring für Lieferantenauswahl.',
    project_status: 'active',
    project_start: '2024-07-01',
    project_end: null,
  },
]

async function getOrCreateCompany(name: string, industry: string): Promise<string> {
  const { data: existing } = await supabase
    .from('companies')
    .select('id, industry')
    .eq('organization_id', ORG_ID)
    .ilike('name', name)
    .limit(1)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: created, error } = await supabase
    .from('companies')
    .insert({
      organization_id: ORG_ID,
      name,
      industry,
    })
    .select('id')
    .single()

  if (error || !created) {
    throw new Error(`Company "${name}": ${error?.message ?? 'insert failed'}`)
  }

  console.log(`  + Company angelegt: ${name}`)
  return created.id
}

async function main() {
  console.log(`Seed 20 Referenzen → Org ${ORG_ID}\n`)

  const inserted: { id: string; title: string }[] = []

  for (const ref of REFERENCES) {
    const companyId = await getOrCreateCompany(
      ref.companyName,
      ref.companyIndustry ?? ref.industry,
    )

    const approval_internal_status =
      ref.status === 'approved' ? 'approved_internal' : 'pending_internal'

    const { data, error } = await supabase
      .from('references')
      .insert({
        organization_id: ORG_ID,
        company_id: companyId,
        created_by: CREATED_BY,
        title: ref.title,
        summary: ref.summary,
        industry: ref.industry,
        country: ref.country,
        volume_eur: ref.volume_eur,
        contract_type: ref.contract_type,
        status: ref.status,
        tags: ref.tags,
        incumbent_provider: ref.incumbent_provider,
        competitors: ref.competitors,
        customer_challenge: ref.customer_challenge,
        our_solution: ref.our_solution,
        project_status: ref.project_status,
        project_start: ref.project_start,
        project_end: ref.project_end,
        approval_internal_status,
      })
      .select('id, title')
      .single()

    if (error || !data) {
      throw new Error(`Referenz "${ref.title}": ${error?.message ?? 'insert failed'}`)
    }

    inserted.push(data)
    console.log(`✓ ${ref.title}`)
  }

  console.log(`\n${inserted.length} Referenzen eingespielt.`)
  console.log('Starte Embedding-Backfill für neue Einträge…')

  const { execSync } = await import('child_process')
  execSync(
    'npx tsx --require dotenv/config scripts/backfill-embeddings.ts dotenv_config_path=.env.local',
    { stdio: 'inherit', cwd: process.cwd(), env: process.env },
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

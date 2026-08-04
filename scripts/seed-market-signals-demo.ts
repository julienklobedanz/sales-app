/**
 * Reichert Marktsignale im Demo-Workspace für Homepage Universal-Suche & Marktsignale-UI an.
 *
 * Legt manuelle Account-News (ingest_source=manual) und Führungswechsel (event_kind=role_change)
 * für bestehende Referenz-Accounts an. Idempotent über content_hash.
 *
 * Ausführung:
 *   npx tsx --env-file=.env.local scripts/seed-market-signals-demo.ts
 *
 * Optional:
 *   ORGANIZATION_ID=<uuid>  — andere Organisation
 *   MARK_FAVORITES=1        — DAZN, Commerzbank, Siemens als Favoriten markieren
 */

import { createHash } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY erforderlich.')
  process.exit(1)
}

const ORG_ID =
  process.env.ORGANIZATION_ID?.trim() || '3439c54a-93f9-428e-9ee3-cf61739805b4'
const CREATED_BY = 'e9f31c6a-a436-4f19-b0a8-24c5c790419d'
const MARK_FAVORITES = process.env.MARK_FAVORITES !== '0'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const SEED_VERSION = 'refstack-demo-market-signals-v1'

type NewsSeed = {
  companyNames: string[]
  seedKey: string
  body: string
  source_label: string
  segment: 'customer' | 'prospect'
  daysAgo: number
}

type ExecSeed = {
  companyNames: string[]
  seedKey: string
  person_name: string
  person_title_before: string | null
  person_title_after: string | null
  change_summary: string
  daysAgo: number
}

const ACCOUNT_NEWS: NewsSeed[] = [
  {
    companyNames: ['DAZN'],
    seedKey: 'dazn-sport-streaming-cdn',
    body: 'News: DAZN plant CDN-Ausbau für Sport-Streaming-Peaks — Kapazität für Champions-League-Abende soll bis Q3 um 40 % steigen.',
    source_label: 'Branchenpresse',
    segment: 'customer',
    daysAgo: 1,
  },
  {
    companyNames: ['Commerzbank'],
    seedKey: 'commerzbank-instant-payment',
    body: 'IT-Budget 2026: Commerzbank erhöht Investitionen in Instant-Payment-Hub und Betrugserkennung um 18 %.',
    source_label: 'Earnings Call',
    segment: 'customer',
    daysAgo: 2,
  },
  {
    companyNames: ['Siemens'],
    seedKey: 'siemens-5g-factory',
    body: 'Siemens kündigt Ausbau des Private-5G-Campusnetzes in Amberg an — Smart Factory als Referenz für Industrie 4.0.',
    source_label: 'Pressemitteilung',
    segment: 'customer',
    daysAgo: 0,
  },
  {
    companyNames: ['Allianz Versicherung', 'Allianz'],
    seedKey: 'allianz-genai-claims',
    body: 'News zur Schadensbearbeitung: Allianz testet GenAI-Dokumentenverständnis in der DACH-Region.',
    source_label: 'Versicherungsmonitor',
    segment: 'customer',
    daysAgo: 3,
  },
  {
    companyNames: ['BMW'],
    seedKey: 'bmw-battery-passport',
    body: 'BMW startet EU-Batteriepassport-Pilot — Rückverfolgbarkeit entlang der EV-Wertschöpfungskette ab Werk Leipzig.',
    source_label: 'Automobilwoche',
    segment: 'customer',
    daysAgo: 4,
  },
  {
    companyNames: ['RWE'],
    seedKey: 'rwe-wind-solar',
    body: 'RWE meldet Rekord-Feed-in aus Wind und Solar — Lastmanagement-Plattform wird auf weitere Regelzonen ausgerollt.',
    source_label: 'Energy News',
    segment: 'customer',
    daysAgo: 5,
  },
  {
    companyNames: ['BioNTech SE'],
    seedKey: 'biontech-gxp-cloud',
    body: 'BioNTech beschleunigt GxP-Cloud-Migration für klinische Studien — Audit-Readiness bis Jahresende.',
    source_label: 'Pharma Journal',
    segment: 'customer',
    daysAgo: 6,
  },
  {
    companyNames: ['Lufthansa Technik', 'Lufthansa'],
    seedKey: 'lht-predictive-maintenance',
    body: 'Lufthansa Technik erweitet Predictive-Maintenance für Triebwerke — IoT-Sensordaten aus 120 Flugzeugen angebunden.',
    source_label: 'Aviation Today',
    segment: 'customer',
    daysAgo: 2,
  },
  {
    companyNames: ['Stadt München'],
    seedKey: 'muenchen-smart-city',
    body: 'Stadt München: Smart-City-Pilot mit adaptiven Ampeln — Verkehrssteuerung an drei Hauptachsen live.',
    source_label: 'Kommunal News',
    segment: 'customer',
    daysAgo: 7,
  },
  {
    companyNames: ['Fraport', 'Fraport AG'],
    seedKey: 'fraport-passenger-flow',
    body: 'Fraport investiert in Passagierfluss-Analyse am Drehkreuz — BI-Dashboards für Terminal 1 und 2.',
    source_label: 'Flughafen Zeitung',
    segment: 'customer',
    daysAgo: 1,
  },
  {
    companyNames: ['Arla'],
    seedKey: 'arla-recall-management',
    body: 'Arla rollt digitales Rückruf-Management für Lebensmittelkette aus — Recall-Simulation in unter 2 Stunden.',
    source_label: 'Food Logistics',
    segment: 'customer',
    daysAgo: 8,
  },
  {
    companyNames: ['Hochtief'],
    seedKey: 'hochtief-digital-twin',
    body: 'Hochtief präsentiert Digital Twin für Hochhaus-Neubau — BIM-Daten fließen in den Gebäudebetrieb.',
    source_label: 'Bauindustrie',
    segment: 'prospect',
    daysAgo: 9,
  },
  {
    companyNames: ['Marriott EMEA'],
    seedKey: 'marriott-crm-rollout',
    body: 'Neuer CRM-Rollout für DACH: Marriott EMEA vereinheitlicht Gästeprofile in Premium-Hotels.',
    source_label: 'Hotel News',
    segment: 'customer',
    daysAgo: 3,
  },
  {
    companyNames: ['BASF Ludwigshafen', 'BASF'],
    seedKey: 'basf-ot-it',
    body: 'BASF Ludwigshafen: OT/IT-Segmentierung in Spezialchemie-Anlage abgeschlossen — Zero-Trust-Zonen live.',
    source_label: 'Chemie Report',
    segment: 'customer',
    daysAgo: 4,
  },
  {
    companyNames: ['Charité Berlin'],
    seedKey: 'charite-radiology-ai',
    body: 'Charité Berlin startet KI-gestützten Radiologie-Workflow im Klinikverbund — News aus dem Gesundheitssektor.',
    source_label: 'Health IT',
    segment: 'prospect',
    daysAgo: 5,
  },
  {
    companyNames: ['KION Group'],
    seedKey: 'kion-cold-chain',
    body: 'KION Group erweitert Kühlketten-Monitoring für Pharma-Logistik — SAP-Integration in Phase 2.',
    source_label: 'Logistik heute',
    segment: 'customer',
    daysAgo: 6,
  },
]

const EXEC_EVENTS: ExecSeed[] = [
  {
    companyNames: ['DAZN'],
    seedKey: 'dazn-cto',
    person_name: 'Elena Vogt',
    person_title_before: 'VP Engineering',
    person_title_after: 'CTO',
    change_summary:
      'Elena Vogt übernimmt als CTO — Fokus auf Sport-Streaming-Plattform und CDN-Skalierung.',
    daysAgo: 2,
  },
  {
    companyNames: ['Commerzbank'],
    seedKey: 'commerzbank-ciso',
    person_name: 'Thomas Müller',
    person_title_before: 'Head of Security',
    person_title_after: 'CISO',
    change_summary:
      'Thomas Müller wechselt auf den CISO-Posten — verantwortet Betrugserkennung und Instant Payment.',
    daysAgo: 5,
  },
  {
    companyNames: ['Siemens'],
    seedKey: 'siemens-vp-digital',
    person_name: 'Sarah K.',
    person_title_before: null,
    person_title_after: 'VP Digital Factory',
    change_summary:
      'Sarah K. neu eingestellt als VP Digital Factory — Smart Factory Amberg und 5G-Campus.',
    daysAgo: 4,
  },
  {
    companyNames: ['Allianz Versicherung', 'Allianz'],
    seedKey: 'allianz-cdo',
    person_name: 'Marc Weber',
    person_title_before: 'Director Data',
    person_title_after: 'CDO',
    change_summary:
      'Marc Weber wird CDO — treibt GenAI in der Schadensbearbeitung voran.',
    daysAgo: 7,
  },
  {
    companyNames: ['BMW'],
    seedKey: 'bmw-supply-chain',
    person_name: 'Julia Hartmann',
    person_title_before: 'Director Supply Chain',
    person_title_after: 'SVP EV Value Chain',
    change_summary:
      'Julia Hartmann leitet nun EV-Wertschöpfungskette und Batteriepassport-Programm.',
    daysAgo: 3,
  },
  {
    companyNames: ['RWE'],
    seedKey: 'rwe-cto-grid',
    person_name: 'Peter Schneider',
    person_title_before: 'CTO Renewables',
    person_title_after: 'CTO Grid & Renewables',
    change_summary:
      'Peter Schneider erweitert Mandat — Lastmanagement für Wind- und Solar-Feed-in.',
    daysAgo: 6,
  },
  {
    companyNames: ['Fraport', 'Fraport AG'],
    seedKey: 'fraport-cio',
    person_name: 'Anna Richter',
    person_title_before: 'CIO',
    person_title_after: 'CDO',
    change_summary:
      'Anna Richter wechselt von CIO auf CDO — Passagierfluss-Analyse und Data Mesh.',
    daysAgo: 1,
  },
  {
    companyNames: ['Marriott EMEA'],
    seedKey: 'marriott-crm',
    person_name: 'David Chen',
    person_title_before: 'VP Sales',
    person_title_after: 'VP CRM & Guest Experience',
    change_summary:
      'David Chen verantwortet CRM-Rollout für Premium-Hotelgruppe in DACH.',
    daysAgo: 8,
  },
]

const FAVORITE_COMPANIES = ['DAZN', 'Commerzbank', 'Siemens', 'Allianz', 'BMW']

function seedHash(kind: string, seedKey: string): string {
  return createHash('sha256')
    .update(`${SEED_VERSION}|${kind}|${seedKey}`, 'utf8')
    .digest('hex')
}

function daysAgoIso(daysAgo: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function daysAgoTimestamp(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

async function resolveCompanyId(names: string[]): Promise<string | null> {
  for (const name of names) {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .eq('organization_id', ORG_ID)
      .ilike('name', name)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn(`  ! Company lookup "${name}": ${error.message}`)
      continue
    }

    if (data?.id) return String(data.id)
  }

  const primary = names[0] ?? '?'
  console.warn(`  ! Company nicht gefunden: ${primary}`)
  return null
}

async function insertNews(
  seed: NewsSeed,
  companyId: string,
): Promise<'inserted' | 'skipped' | 'error'> {
  const content_hash = seedHash('news', seed.seedKey)
  const { data: existing } = await supabase
    .from('market_signal_account_news')
    .select('id')
    .eq('company_id', companyId)
    .eq('content_hash', content_hash)
    .maybeSingle()

  if (existing?.id) return 'skipped'

  const { error } = await supabase.from('market_signal_account_news').insert({
    company_id: companyId,
    body: seed.body,
    source_label: seed.source_label,
    published_on: daysAgoIso(seed.daysAgo),
    segment: seed.segment,
    ingest_source: 'manual',
    content_hash,
    created_by: CREATED_BY,
    created_at: daysAgoTimestamp(seed.daysAgo),
  })

  if (error) {
    const code = (error as { code?: string }).code
    if (code === '23505') return 'skipped'
    console.warn(`  ! News "${seed.seedKey}": ${error.message}`)
    return 'error'
  }

  return 'inserted'
}

async function insertExec(
  seed: ExecSeed,
  companyId: string,
): Promise<'inserted' | 'skipped' | 'error'> {
  const content_hash = seedHash('exec', seed.seedKey)
  const { data: existing } = await supabase
    .from('market_signal_executive_events')
    .select('id')
    .eq('company_id', companyId)
    .eq('content_hash', content_hash)
    .maybeSingle()

  if (existing?.id) return 'skipped'

  const { error } = await supabase.from('market_signal_executive_events').insert({
    company_id: companyId,
    person_name: seed.person_name,
    person_title_before: seed.person_title_before,
    person_title_after: seed.person_title_after,
    change_summary: seed.change_summary,
    detected_at: daysAgoTimestamp(seed.daysAgo),
    event_kind: 'role_change',
    content_hash,
    created_by: CREATED_BY,
    created_at: daysAgoTimestamp(seed.daysAgo),
  })

  if (error) {
    const code = (error as { code?: string }).code
    if (code === '23505') return 'skipped'
    console.warn(`  ! Exec "${seed.seedKey}": ${error.message}`)
    return 'error'
  }

  return 'inserted'
}

async function markFavorites() {
  if (!MARK_FAVORITES) return

  let marked = 0
  for (const name of FAVORITE_COMPANIES) {
    const companyId = await resolveCompanyId([name])
    if (!companyId) continue

    const { error } = await supabase
      .from('companies')
      .update({ is_favorite: true })
      .eq('id', companyId)
      .eq('organization_id', ORG_ID)

    if (!error) marked += 1
  }

  if (marked > 0) {
    console.log(`\n${marked} Accounts als Favorit markiert (für Marktsignale-Fokus).`)
  }
}

async function main() {
  console.log(`Marktsignale-Demo-Seed → Org ${ORG_ID}\n`)

  let newsInserted = 0
  let newsSkipped = 0
  let execInserted = 0
  let execSkipped = 0

  for (const seed of ACCOUNT_NEWS) {
    const companyId = await resolveCompanyId(seed.companyNames)
    if (!companyId) continue

    const result = await insertNews(seed, companyId)
    if (result === 'inserted') {
      newsInserted += 1
      console.log(`✓ News: ${seed.companyNames[0]} — ${seed.seedKey}`)
    } else if (result === 'skipped') {
      newsSkipped += 1
    }
  }

  for (const seed of EXEC_EVENTS) {
    const companyId = await resolveCompanyId(seed.companyNames)
    if (!companyId) continue

    const result = await insertExec(seed, companyId)
    if (result === 'inserted') {
      execInserted += 1
      console.log(`✓ Exec: ${seed.companyNames[0]} — ${seed.person_name}`)
    } else if (result === 'skipped') {
      execSkipped += 1
    }
  }

  await markFavorites()

  console.log('\nZusammenfassung:')
  console.log(`  Account-News: ${newsInserted} neu, ${newsSkipped} bereits vorhanden`)
  console.log(`  Executive-Events: ${execInserted} neu, ${execSkipped} bereits vorhanden`)
  console.log('\nHomepage-Suche testen mit:')
  console.log(
    '  News | CRM-Rollout | Thomas Müller | IT-Budget | SAP | sport streaming | DAZN',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

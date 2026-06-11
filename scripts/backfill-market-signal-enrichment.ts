/**
 * Backfill für LLM-/Heuristik-Anreicherung bestehender Marktsignale (RSS-Einträge ohne insight_*).
 *
 * Voraussetzungen:
 * - SUPABASE_URL (oder NEXT_PUBLIC_SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE_KEY
 * - OPENAI_API_KEY (optional — ohne Key wird heuristischer Fallback genutzt)
 *
 * Env-Optionen:
 * - ORGANIZATION_ID — nur eine Organisation
 * - MAX_NEWS / MAX_EXEC — Limits pro Lauf (Default 80)
 * - PAUSE_MS — Pause zwischen OpenAI-Calls (Default 350)
 * - REMOVE_IRRELEVANT=0 — irrelevante Signale nicht löschen
 *
 * Ausführung:
 *   npx tsx --env-file=.env.local scripts/backfill-market-signal-enrichment.ts
 *   ORGANIZATION_ID=<uuid> npx tsx --env-file=.env.local scripts/backfill-market-signal-enrichment.ts
 */

import { createClient } from '@supabase/supabase-js'

import { runMarketSignalEnrichmentBackfill } from '../lib/market-signals/backfill-signal-enrichment'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Fehlende Umgebungsvariablen: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY werden benötigt.'
  )
  console.error(
    'Ausführung: npx tsx --env-file=.env.local scripts/backfill-market-signal-enrichment.ts'
  )
  process.exit(1)
}

const organizationId = process.env.ORGANIZATION_ID?.trim() || undefined
const maxNews = Number(process.env.MAX_NEWS ?? '80')
const maxExecutives = Number(process.env.MAX_EXEC ?? '80')
const pauseMs = Number(process.env.PAUSE_MS ?? '350')
const removeIrrelevant = process.env.REMOVE_IRRELEVANT !== '0'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  console.log('Marktsignal-Enrichment Backfill …')
  if (organizationId) console.log(`  Organisation: ${organizationId}`)
  console.log(`  Limits: news=${maxNews}, exec=${maxExecutives}, pause=${pauseMs}ms`)
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.warn('  OPENAI_API_KEY fehlt — es wird nur der heuristische Fallback verwendet.')
  }

  const result = await runMarketSignalEnrichmentBackfill(supabase, {
    organizationId,
    maxNews: Number.isFinite(maxNews) ? maxNews : 80,
    maxExecutives: Number.isFinite(maxExecutives) ? maxExecutives : 80,
    pauseMsBetweenItems: Number.isFinite(pauseMs) ? pauseMs : 350,
    removeIrrelevant,
  })

  console.log('\nErgebnis:')
  console.log(
    `  Account-News: ${result.newsProcessed} verarbeitet, ${result.newsUpdated} aktualisiert, ${result.newsDeleted} entfernt (irrelevant)`
  )
  console.log(
    `  Executive-Events: ${result.executivesProcessed} verarbeitet, ${result.executivesUpdated} aktualisiert, ${result.executivesDeleted} entfernt (irrelevant)`
  )
  if (result.errors.length) {
    console.warn(`\nFehler (${result.errors.length}):`)
    for (const err of result.errors.slice(0, 15)) console.warn(`  - ${err}`)
    if (result.errors.length > 15) console.warn(`  … und ${result.errors.length - 15} weitere`)
  }
  console.log('\nFertig.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

/**
 * Backfill für Referenz-Embeddings (erweiterter Index-Text inkl. Kunde, Volumen, Tags, …).
 *
 * Standard: nur embedding IS NULL.
 * REINDEX_ALL=1: alle Referenzen neu vektorisieren (nach Embedding-Erweiterung).
 * REINDEX_IDS=id1,id2: nur diese UUIDs neu vektorisieren.
 *
 * Voraussetzungen:
 * - SUPABASE_URL (oder NEXT_PUBLIC_SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE_KEY
 * - OPENAI_API_KEY
 *
 * Ausführung:
 *   npx ts-node --require dotenv/config scripts/backfill-embeddings.ts dotenv_config_path=.env.local
 *   REINDEX_ALL=1 npx ts-node --require dotenv/config scripts/backfill-embeddings.ts dotenv_config_path=.env.local
 */

import { createClient } from '@supabase/supabase-js'

import { buildReferenceEmbeddingText } from '../lib/references/reference-embedding-text'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Fehlende Umgebungsvariablen: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY werden benötigt.')
  console.error('Ausführung: npx ts-node --require dotenv/config scripts/backfill-embeddings.ts dotenv_config_path=.env.local')
  process.exit(1)
}

if (!OPENAI_API_KEY) {
  console.error('Fehlende Umgebungsvariable: OPENAI_API_KEY wird benötigt.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const REINDEX_ALL = process.env.REINDEX_ALL === '1' || process.env.REINDEX_ALL === 'true'
const REINDEX_IDS = (process.env.REINDEX_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

type RefRow = {
  id: string
  title: string | null
  summary: string | null
  customer_challenge: string | null
  our_solution: string | null
  industry: string | null
  volume_eur: string | null
  tags: string | null
  country: string | null
  contract_type: string | null
  incumbent_provider: string | null
  competitors: string | null
  project_status: string | null
  companies: { name: string } | { name: string }[] | null
}

async function fetchBatch(limit: number, afterId: string | null): Promise<RefRow[]> {
  let q = supabase
    .from('references')
    .select(
      `
      id,
      title,
      summary,
      customer_challenge,
      our_solution,
      industry,
      volume_eur,
      tags,
      country,
      contract_type,
      incumbent_provider,
      competitors,
      project_status,
      companies ( name )
    `
    )
    .order('id', { ascending: true })
    .limit(limit)

  if (REINDEX_IDS.length > 0) {
    q = q.in('id', REINDEX_IDS).is('embedding_error', null)
    if (afterId) {
      q = q.gt('id', afterId)
    }
  } else if (afterId) {
    q = q.gt('id', afterId)
  }

  if (REINDEX_IDS.length === 0) {
    if (!REINDEX_ALL) {
      q = q.is('embedding', null).is('embedding_error', null)
    } else {
      q = q.is('embedding_error', null)
    }
  }

  const { data, error } = await q

  if (error) {
    throw error
  }
  return (data as RefRow[]) || []
}

async function embed(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  })

  if (!response.ok) {
    const raw = await response.text()
    throw new Error(`OpenAI Embeddings API Fehler ${response.status}: ${raw}`)
  }

  const json = (await response.json()) as { data: Array<{ embedding: number[] }> }
  return json.data.map((d: { embedding: number[] }) => d.embedding)
}

const BATCH_SIZE = 100 // max pro Request (OpenAI/Spec)

async function run() {
  let processed = 0
  console.log(
    REINDEX_IDS.length > 0
      ? `Backfill: REINDEX_IDS — ${REINDEX_IDS.length} Referenz(en) werden neu vektorisiert…`
      : REINDEX_ALL
        ? 'Backfill: REINDEX_ALL — alle Referenzen werden neu vektorisiert…'
        : 'Backfill: Starte Verarbeitung (nur Einträge mit embedding IS NULL)…'
  )

  let reindexCursor: string | null = null

  while (true) {
    const batch = await fetchBatch(BATCH_SIZE, REINDEX_ALL || REINDEX_IDS.length > 0 ? reindexCursor : null)
    if (!batch.length) {
      console.log(
        REINDEX_ALL
          ? 'Fertig – alle Referenzen verarbeitet.'
          : 'Fertig – keine weiteren Referenzen ohne Embedding.'
      )
      break
    }

    if (REINDEX_ALL || REINDEX_IDS.length > 0) {
      reindexCursor = batch[batch.length - 1]?.id ?? reindexCursor
    }

    console.log(`Verarbeite Batch mit ${batch.length} Referenzen…`)

    const inputs = batch.map((r) => {
      const companyRaw = r.companies
      const companyName = Array.isArray(companyRaw) ? companyRaw[0]?.name : companyRaw?.name
      return buildReferenceEmbeddingText({
        title: r.title,
        industry: r.industry,
        customer_challenge: r.customer_challenge,
        our_solution: r.our_solution,
        summary: r.summary,
        volume_eur: r.volume_eur,
        tags: r.tags,
        country: r.country,
        contract_type: r.contract_type,
        incumbent_provider: r.incumbent_provider,
        competitors: r.competitors,
        project_status: r.project_status,
        company_name: companyName ?? null,
      })
    })

    // Einige Referenzen könnten leere Texte haben → diese werden markiert, damit sie nicht erneut gezogen werden
    const nonEmptyIndices = inputs
      .map((t, idx) => ({ t, idx }))
      .filter(({ t }) => t.trim().length > 0)
    const emptyIndices = inputs
      .map((t, idx) => ({ t, idx }))
      .filter(({ t }) => t.trim().length === 0)
      .map(({ idx }) => idx)

    if (!nonEmptyIndices.length) {
      console.log('Batch enthält nur Referenzen ohne Textinhalt – werden markiert.')
      for (const idx of emptyIndices) {
        const row = batch[idx]
        try {
          const { error } = await supabase
            .from('references')
            .update({
              embedding_error: 'NO_TEXT_TO_EMBED',
              embedding_updated_at: null,
            })
            .eq('id', row.id)
          if (error) {
            console.error(`Update-Fehler (NO_TEXT_TO_EMBED) für Referenz ${row.id}:`, error.message)
          } else {
            processed += 1
          }
        } catch (e) {
          console.error(`Unerwarteter Fehler beim Markieren von ${row.id}:`, e)
        }
      }
      continue
    }

    const textsToEmbed = nonEmptyIndices.map(({ t }) => t)
    let embeddings: number[][]
    try {
      embeddings = await embed(textsToEmbed)
    } catch (e) {
      console.error('Fehler beim Embedding-Batch:', e)
      break
    }

    // Updates durchführen
    for (let i = 0; i < nonEmptyIndices.length; i++) {
      const { idx } = nonEmptyIndices[i]
      const row = batch[idx]
      const vector = embeddings[i]
      try {
        if (!Array.isArray(vector) || vector.length !== 1536) {
          await supabase
            .from('references')
            .update({ embedding_error: 'INVALID_EMBEDDING_DIM' })
            .eq('id', row.id)
          continue
        }
        const { error } = await supabase
          .from('references')
          .update({
            embedding: vector,
            embedding_updated_at: new Date().toISOString(),
            embedding_error: null,
          })
          .eq('id', row.id)
        if (error) {
          console.error(`Update-Fehler für Referenz ${row.id}:`, error.message)
        } else {
          processed += 1
        }
      } catch (e) {
        console.error(`Unerwarteter Fehler beim Update von ${row.id}:`, e)
      }
    }

    // Leere Texte ebenfalls markieren (damit sie nicht erneut bei embedding IS NULL gezogen werden)
    for (const idx of emptyIndices) {
      const row = batch[idx]
      try {
        const { error } = await supabase
          .from('references')
          .update({
            embedding_error: 'NO_TEXT_TO_EMBED',
            embedding_updated_at: null,
          })
          .eq('id', row.id)
        if (error) {
          console.error(
            `Update-Fehler (NO_TEXT_TO_EMBED) für Referenz ${row.id}:`,
            error.message
          )
        } else {
          processed += 1
        }
      } catch (e) {
        console.error(`Unerwarteter Fehler beim Markieren von ${row.id}:`, e)
      }
    }

    console.log(`Bisher verarbeitet: ${processed} Referenzen.`)
  }

  console.log(`Backfill abgeschlossen. Insgesamt verarbeitet: ${processed} Referenzen.`)
}

run().catch((err) => {
  console.error('Backfill abgebrochen wegen Fehler:', err)
  process.exit(1)
})


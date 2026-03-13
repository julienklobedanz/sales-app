/**
 * Backfill-Script für Referenz-Embeddings.
 *
 * Voraussetzungen:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (oder ein Key mit Schreibrechten auf public.references)
 * - OPENAI_API_KEY
 *
 * Ausführung (Beispiel):
 *   npx ts-node scripts/backfill-embeddings.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Fehlende Umgebungsvariablen: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY werden benötigt.')
  process.exit(1)
}

if (!OPENAI_API_KEY) {
  console.error('Fehlende Umgebungsvariable: OPENAI_API_KEY wird benötigt.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type RefRow = {
  id: string
  title: string | null
  summary: string | null
  customer_challenge: string | null
  our_solution: string | null
  industry: string | null
}

async function fetchBatch(limit: number): Promise<RefRow[]> {
  const { data, error } = await supabase
    .from<RefRow>('references')
    .select('id, title, summary, customer_challenge, our_solution, industry')
    .is('embedding', null)
    .limit(limit)

  if (error) {
    throw error
  }
  return data ?? []
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
    throw new Error(`OpenAI Embeddings Error: ${response.status} ${raw}`)
  }

  const json = (await response.json()) as { data: Array<{ embedding: number[] }> }
  return json.data.map((d) => d.embedding)
}

async function run() {
  const BATCH_SIZE = 50
  let processed = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await fetchBatch(BATCH_SIZE)
    if (!batch.length) {
      console.log('Fertig – keine weiteren Referenzen ohne Embedding.')
      break
    }

    console.log(`Verarbeite Batch mit ${batch.length} Referenzen…`)

    const inputs = batch.map((r) => {
      const parts = [
        r.title,
        r.summary,
        r.customer_challenge,
        r.our_solution,
        r.industry,
      ]
        .filter((p): p is string => !!p && p.trim().length > 0)
        .map((p) => p.trim())

      if (!parts.length) {
        return ''
      }
      return parts.join('\n\n')
    })

    // Einige Referenzen könnten leere Texte haben → wir überspringen diese, statt sie zu embedden
    const nonEmptyIndices = inputs
      .map((t, idx) => ({ t, idx }))
      .filter(({ t }) => t.trim().length > 0)

    if (!nonEmptyIndices.length) {
      console.log('Batch enthält nur Referenzen ohne Textinhalt – übersprungen.')
      processed += batch.length
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
        const { error } = await supabase
          .from('references')
          .update({ embedding: vector })
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

    console.log(`Bisher verarbeitet: ${processed} Referenzen.`)
  }

  console.log(`Backfill abgeschlossen. Insgesamt verarbeitet: ${processed} Referenzen.`)
}

run().catch((err) => {
  console.error('Backfill abgebrochen wegen Fehler:', err)
  process.exit(1)
})


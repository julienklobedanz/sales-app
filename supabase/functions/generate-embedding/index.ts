import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

type Payload = { reference_id?: string }

/** Spiegel von lib/references/reference-embedding-text.ts (Deno kann @/lib nicht importieren). */
type ReferenceEmbeddingSource = {
  title?: string | null
  industry?: string | null
  customer_challenge?: string | null
  our_solution?: string | null
  summary?: string | null
  volume_eur?: string | null
  tags?: string | null
  country?: string | null
  contract_type?: string | null
  incumbent_provider?: string | null
  competitors?: string | null
  project_status?: string | null
  company_name?: string | null
}

function buildReferenceEmbeddingText(ref: ReferenceEmbeddingSource): string {
  const lines: string[] = []
  const labeled = (label: string, value: string | null | undefined) => {
    const t = value?.trim()
    if (t) lines.push(`${label}: ${t}`)
  }
  const plain = (value: string | null | undefined) => {
    const t = value?.trim()
    if (t) lines.push(t)
  }

  labeled('Kunde/Account', ref.company_name)
  labeled('Branche', ref.industry)
  labeled('Region', ref.country)
  labeled('Volumen', ref.volume_eur)
  labeled('Vertragsart', ref.contract_type)
  const ps = ref.project_status?.trim().toLowerCase()
  if (ps === 'active') labeled('Projektstatus', 'Aktiv')
  else if (ps === 'completed') labeled('Projektstatus', 'Abgeschlossen')
  else if (ref.project_status?.trim()) labeled('Projektstatus', ref.project_status)
  labeled('Incumbent', ref.incumbent_provider)
  labeled('Wettbewerb', ref.competitors)

  const tags = ref.tags
    ?.split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .join(', ')
  if (tags) lines.push(`Tags: ${tags}`)

  plain(ref.title)
  if (ref.customer_challenge?.trim()) lines.push(`Herausforderung:\n${ref.customer_challenge.trim()}`)
  if (ref.our_solution?.trim()) lines.push(`Lösung:\n${ref.our_solution.trim()}`)
  if (ref.summary?.trim()) lines.push(`Zusammenfassung:\n${ref.summary.trim()}`)

  return lines.join('\n\n')
}

serve(async (req) => {
  const payload = (await req.json().catch(() => ({}))) as Payload
  const reference_id = payload.reference_id?.toString()

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!reference_id) {
      return new Response(JSON.stringify({ success: false, error: 'reference_id fehlt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!supabaseUrl || !serviceRoleKey || !openaiKey) {
      try {
        if (supabaseUrl && serviceRoleKey && reference_id) {
          const supabaseForError = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false },
          })
          await supabaseForError
            .from('references')
            .update({
              embedding_error: !openaiKey ? 'MISSING_OPENAI_API_KEY' : 'MISSING_SUPABASE_SECRETS',
              embedding_updated_at: null,
            })
            .eq('id', reference_id)
        }
      } catch {
        // ignore
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
    const openai = new OpenAI({ apiKey: openaiKey })

    const { data: ref, error: refErr } = await supabase
      .from('references')
      .select(
        `
        title,
        industry,
        customer_challenge,
        our_solution,
        summary,
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
      .eq('id', reference_id)
      .single()

    if (refErr || !ref) {
      await supabase
        .from('references')
        .update({ embedding_error: refErr?.message ?? 'Reference not found' })
        .eq('id', reference_id)
      return new Response(JSON.stringify({ success: false, error: refErr?.message ?? 'not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const companyRaw = ref.companies as { name?: string } | { name?: string }[] | null
    const companyName = Array.isArray(companyRaw)
      ? companyRaw[0]?.name
      : companyRaw?.name

    const text = buildReferenceEmbeddingText({
      title: ref.title,
      industry: ref.industry,
      customer_challenge: ref.customer_challenge,
      our_solution: ref.our_solution,
      summary: ref.summary,
      volume_eur: ref.volume_eur,
      tags: ref.tags,
      country: ref.country,
      contract_type: ref.contract_type,
      incumbent_provider: ref.incumbent_provider,
      competitors: ref.competitors,
      project_status: ref.project_status,
      company_name: companyName ?? null,
    })

    if (!text.trim()) {
      await supabase
        .from('references')
        .update({
          embedding: null,
          embedding_updated_at: null,
          embedding_error: 'NO_TEXT_TO_EMBED',
        })
        .eq('id', reference_id)
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    const vector = embeddingResponse.data?.[0]?.embedding
    if (!Array.isArray(vector) || vector.length !== 1536) {
      await supabase
        .from('references')
        .update({ embedding_error: 'INVALID_EMBEDDING_DIM' })
        .eq('id', reference_id)
      return new Response(JSON.stringify({ success: false, error: 'Invalid embedding result' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await supabase
      .from('references')
      .update({
        embedding: vector,
        embedding_updated_at: new Date().toISOString(),
        embedding_error: null,
      })
      .eq('id', reference_id)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: (e as Error)?.message ?? 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

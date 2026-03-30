import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

type Payload = { reference_id?: string }

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { reference_id } = (await req.json().catch(() => ({}))) as Payload
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
      .select('title, customer_challenge, our_solution, summary, industry')
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

    const parts = [
      ref.title,
      ref.industry,
      ref.customer_challenge,
      ref.our_solution,
      ref.summary,
    ].filter((x) => typeof x === 'string' && x.trim().length > 0) as string[]

    if (!parts.length) {
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

    const text = parts.join('\n\n')

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


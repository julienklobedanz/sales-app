import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  buildKiEntwurfUserPrompt,
  type KiEntwurfOutputFormat,
  type KiEntwurfTone,
} from '@/lib/ki-entwurf-prompt'

export const runtime = 'nodejs'

const BodySchema = z.object({
  referenceId: z.string().uuid(),
  matchScore: z.number().min(0).max(1),
  outputFormat: z.enum(['email_snippet', 'proposal_passage', 'elevator_pitch']),
  tone: z.enum(['professional', 'casual', 'formal']),
  additionalContext: z.string().max(8000).optional().nullable(),
  dealContext: z.string().max(12000).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Nicht angemeldet.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Ungültige Anfrage.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Ungültige Parameter.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { referenceId, matchScore, outputFormat, tone, additionalContext, dealContext } = parsed.data

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API ist nicht konfiguriert.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: ref, error: refErr } = await supabase
    .from('references')
    .select(
      `
      id,
      title,
      summary,
      customer_challenge,
      our_solution,
      industry,
      deleted_at,
      companies ( name, organization_id )
    `
    )
    .eq('id', referenceId)
    .maybeSingle()

  if (refErr || !ref || ref.deleted_at) {
    return new Response(JSON.stringify({ error: 'Referenz nicht gefunden.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id as string | undefined
  const companyRaw = ref.companies as
    | { name?: string; organization_id?: string }
    | { name?: string; organization_id?: string }[]
    | null
  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw
  const companyOrgId = company?.organization_id
  if (!orgId || !companyOrgId || companyOrgId !== orgId) {
    return new Response(JSON.stringify({ error: 'Keine Berechtigung für diese Referenz.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userPrompt = buildKiEntwurfUserPrompt({
    reference: {
      title: (ref.title as string) ?? '',
      summary: (ref.summary as string | null) ?? null,
      customerChallenge: (ref.customer_challenge as string | null) ?? null,
      ourSolution: (ref.our_solution as string | null) ?? null,
      industry: (ref.industry as string | null) ?? null,
      companyName: company?.name?.trim() ? (company.name as string) : null,
    },
    matchScore,
    outputFormat: outputFormat as KiEntwurfOutputFormat,
    tone: tone as KiEntwurfTone,
    additionalContext: additionalContext ?? undefined,
    dealContext: dealContext ?? undefined,
  })

  const openai = new OpenAI({ apiKey })

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'Du bist ein erfahrener B2B-Vertriebstexter. Du lieferst nur den angeforderten Text, ohne Einleitung wie „Hier ist…“.',
      },
      { role: 'user', content: userPrompt },
    ],
    temperature: outputFormat === 'elevator_pitch' ? 0.35 : 0.45,
    max_tokens: outputFormat === 'elevator_pitch' ? 400 : 1400,
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const piece = chunk.choices[0]?.delta?.content
          if (piece) controller.enqueue(encoder.encode(piece))
        }
        controller.close()
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Stream-Fehler'
        controller.enqueue(encoder.encode(`\n\n[Fehler: ${message}]`))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

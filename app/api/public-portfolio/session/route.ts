import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { cookies } from 'next/headers'

type Body = {
  slug: string
  sessionId?: string | null
  recipientToken?: string | null
  activeSecondsDelta?: number
  eventType?: string | null
  eventPayload?: Record<string, unknown> | null
  visitorName?: string | null
  visitorEmail?: string | null
}

export async function POST(req: NextRequest) {
  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const slug = String(body.slug ?? '').trim()
  if (!slug) {
    return NextResponse.json({ error: 'missing_slug' }, { status: 400 })
  }

  const countryCode =
    req.headers.get('x-vercel-ip-country')?.trim().slice(0, 2).toUpperCase() || null

  const { data: sp } = await admin
    .from('shared_portfolios')
    .select('id, reference_ids')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!sp?.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  let recipientId: string | null = null
  const recToken = body.recipientToken?.trim()
  if (recToken) {
    const { data: rec } = await admin
      .from('shared_portfolio_recipients')
      .select('id')
      .eq('shared_portfolio_id', sp.id)
      .eq('token', recToken)
      .maybeSingle()
    recipientId = rec?.id ?? null
  }

  const jar = await cookies()
  const gateCookie = jar.get(`portfolio_email_gate_${slug}`)?.value
  let visitorName = body.visitorName?.trim() || null
  let visitorEmail = body.visitorEmail?.trim() || null
  if (gateCookie) {
    try {
      const parsed = JSON.parse(gateCookie) as { name?: string; email?: string }
      visitorName = visitorName || parsed.name?.trim() || null
      visitorEmail = visitorEmail || parsed.email?.trim() || null
    } catch {
      /* ignore */
    }
  }

  const delta = Math.max(0, Math.min(120, Math.trunc(Number(body.activeSecondsDelta) || 0)))
  const sessionId = body.sessionId?.trim()

  if (sessionId) {
    const { data: existing } = await admin
      .from('portfolio_view_sessions')
      .select('id, active_seconds')
      .eq('id', sessionId)
      .eq('slug', slug)
      .maybeSingle()

    if (!existing?.id) {
      return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
    }

    const nextActive = (Number(existing.active_seconds) || 0) + delta
    await admin
      .from('portfolio_view_sessions')
      .update({
        active_seconds: nextActive,
        last_heartbeat_at: new Date().toISOString(),
        country_code: countryCode ?? undefined,
      })
      .eq('id', sessionId)

    if (body.eventType?.trim()) {
      await admin.from('portfolio_view_events').insert({
        session_id: sessionId,
        event_type: body.eventType.trim(),
        payload: (body.eventPayload ?? {}) as import('@/lib/database.types').Json,
      })
    }

    return NextResponse.json({ sessionId, activeSeconds: nextActive })
  }

  const { data: created, error: insertErr } = await admin
    .from('portfolio_view_sessions')
    .insert({
      shared_portfolio_id: sp.id,
      recipient_id: recipientId,
      slug,
      country_code: countryCode,
      visitor_name: visitorName,
      visitor_email: visitorEmail,
      active_seconds: delta,
    })
    .select('id')
    .single()

  if (insertErr || !created?.id) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  await logShareInsight(admin, sp, slug, recipientId, countryCode, visitorName, visitorEmail)

  return NextResponse.json({ sessionId: created.id, activeSeconds: delta })
}

async function logShareInsight(
  admin: NonNullable<ReturnType<typeof createServiceRoleSupabaseClient>>,
  sp: { id: string; reference_ids: string[] | null },
  slug: string,
  recipientId: string | null,
  countryCode: string | null,
  visitorName: string | null,
  visitorEmail: string | null
) {
  const refIds = Array.isArray(sp.reference_ids) ? sp.reference_ids : []
  const refId = refIds[0]
  if (!refId) return

  const { data: ref } = await admin
    .from('references')
    .select('organization_id')
    .eq('id', refId)
    .maybeSingle()
  const orgId = ref?.organization_id
  if (!orgId) return

  await admin.from('evidence_events').insert({
    organization_id: orgId,
    reference_id: refId,
    event_type: 'share_link_viewed',
    payload: {
      slug,
      reference_ids: refIds,
      recipient_id: recipientId,
      country_code: countryCode,
      visitor_name: visitorName,
      visitor_email: visitorEmail,
    },
    created_by: null,
  })
}

import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import {
  buildMarketSignalsDigestEmailHtml,
  buildMarketSignalsEmptyDigestEmailHtml,
  loadMarketSignalsDigestForUser,
  marketSignalsDigestRoleFromProfile,
} from '@/lib/market-signals/market-signals-digest'
import {
  DIGEST_SEND_WINDOW_MINUTES,
  getLocalYmdAndMinutesFromMidnight,
  isDigestSendWindow,
  parseDigestLocalTime,
  parseDigestTimezone,
} from '@/lib/market-signals/digest-schedule'
import { ROUTES } from '@/lib/routes'
import { getAppOrigin } from '@/lib/env/app-origin'
import { getRefstackResendFrom } from '@/lib/email/refstack-email-layout'

export const maxDuration = 300

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

function digestFromAddress(): string {
  return getRefstackResendFrom()
}

function wantsDailyDigest(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  return (raw as Record<string, unknown>).email_daily_market_signals_digest === true
}

function wantsEmptyDayPing(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  return (raw as Record<string, unknown>).email_digest_empty_day === true
}

function lastDigestSentLocalDate(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const v = (raw as Record<string, unknown>).market_signals_digest_last_sent_local_date
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

/**
 * Täglicher Markt-Signale-Überblick.
 * Pro: Cron z. B. alle 10 Min. + lokales Zeitfenster (Timezone/Uhrzeit im Profil).
 * Hobby (Vercel): Cron höchstens 1×/Tag → MARKET_SIGNALS_DIGEST_SKIP_TIME_WINDOW=1 setzen (Versand beim Cron-Lauf, Idempotenz per UTC-Datum).
 * Authorization: Bearer CRON_SECRET · Optional: MARKET_SIGNALS_DIGEST_CRON_DISABLED=1
 */
export async function GET(request: Request) {
  if (process.env.MARKET_SIGNALS_DIGEST_CRON_DISABLED === '1') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const auth = request.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET?.trim()
  const isDev = process.env.NODE_ENV === 'development'

  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else if (!isDev) {
    return NextResponse.json(
      { error: 'CRON_SECRET ist nicht gesetzt (erforderlich außerhalb der Entwicklung).' },
      { status: 503 }
    )
  }

  const resend = getResend()
  if (!resend) {
    return NextResponse.json(
      { ok: false, error: 'RESEND_API_KEY fehlt – Digest nicht versendet.' },
      { status: 503 }
    )
  }

  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY fehlt – Digest nicht möglich.' },
      { status: 503 }
    )
  }

  // Service-Role weil: Digest läuft ohne User-Session; liest Profile org-übergreifend.
  // Grenze: Bearer CRON_SECRET; loadMarketSignalsDigestForUser pro profile.organization_id.
  const now = new Date()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const sinceIso = since.toISOString()
  const sinceDate = sinceIso.slice(0, 10)

  const appOrigin = getAppOrigin()

  const { data: profileRows, error: profErr } = await admin
    .from('profiles')
    .select('id, organization_id, system_role, function_role, notification_settings, full_name')
    .not('organization_id', 'is', null)

  if (profErr) {
    return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 })
  }

  const subscribers = (profileRows ?? []).filter((p) => wantsDailyDigest(p.notification_settings))

  /** Vercel Hobby: Cron nur 1×/Tag – kein 10-Min-Fenster; Idempotenz über UTC-Tag (YYYY-MM-DD). */
  const skipDigestTimeWindow = process.env.MARKET_SIGNALS_DIGEST_SKIP_TIME_WINDOW === '1'

  let sent = 0
  let skippedWindow = 0
  let skippedIdempotent = 0
  let skippedEmpty = 0
  const errors: string[] = []

  for (const row of subscribers) {
    const userId = String((row as { id?: string }).id ?? '')
    const orgId = String((row as { organization_id?: string | null }).organization_id ?? '')
    if (!userId || !orgId) continue

    const nsRaw = (row as { notification_settings?: unknown }).notification_settings

    if (!skipDigestTimeWindow) {
      const tz = parseDigestTimezone(
        nsRaw && typeof nsRaw === 'object' ? (nsRaw as Record<string, unknown>).digest_timezone : undefined
      )
      const { hours: dh, minutes: dm } = parseDigestLocalTime(
        nsRaw && typeof nsRaw === 'object' ? (nsRaw as Record<string, unknown>).digest_local_time : undefined
      )
      if (!isDigestSendWindow(now, tz, dh, dm, DIGEST_SEND_WINDOW_MINUTES)) {
        skippedWindow += 1
        continue
      }
    }

    const idempotencyYmd = skipDigestTimeWindow
      ? now.toISOString().slice(0, 10)
      : getLocalYmdAndMinutesFromMidnight(
          now,
          parseDigestTimezone(
            nsRaw && typeof nsRaw === 'object' ? (nsRaw as Record<string, unknown>).digest_timezone : undefined
          )
        ).ymd

    if (lastDigestSentLocalDate(nsRaw) === idempotencyYmd) {
      skippedIdempotent += 1
      continue
    }

    const role = marketSignalsDigestRoleFromProfile(row)

    const { news, executives } = await loadMarketSignalsDigestForUser(admin, {
      organizationId: orgId,
      role,
      sinceIso,
      sinceDate,
    })

    const emptyPing = wantsEmptyDayPing(nsRaw)
    if (news.length === 0 && executives.length === 0 && !emptyPing) {
      skippedEmpty += 1
      continue
    }

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId)
    const email = userData?.user?.email?.trim()
    if (userErr || !email) {
      errors.push(`${userId}: keine E-Mail`)
      continue
    }

    const recipientName = String((row as { full_name?: string | null }).full_name ?? '').trim()
    const hasContent = news.length > 0 || executives.length > 0

    const html = hasContent
      ? buildMarketSignalsDigestEmailHtml({
          recipientName: recipientName || email.split('@')[0] || 'du',
          news,
          executives,
          appOrigin,
        })
      : buildMarketSignalsEmptyDigestEmailHtml({
          recipientName: recipientName || email.split('@')[0] || 'du',
          appOrigin,
        })

    const n = news.length + executives.length
    const subject = hasContent
      ? `RefStack: ${n} Markt-Signal${n === 1 ? '' : 'e'} (24h)`
      : 'RefStack: Markt-Signale – nichts Neues'

    const { error: sendErr } = await resend.emails.send({
      from: digestFromAddress(),
      to: email,
      subject,
      html,
    })

    if (sendErr) {
      errors.push(`${email}: ${sendErr.message}`)
      continue
    }

    sent += 1

    const prevNs =
      nsRaw && typeof nsRaw === 'object' && !Array.isArray(nsRaw)
        ? { ...(nsRaw as Record<string, unknown>) }
        : {}
    const nextNs = {
      ...prevNs,
      market_signals_digest_last_sent_local_date: idempotencyYmd,
    }
    const { error: upErr } = await admin.from('profiles').update({ notification_settings: nextNs }).eq('id', userId)
    if (upErr) errors.push(`${userId}: Marker nicht gespeichert: ${upErr.message}`)
  }

  return NextResponse.json({
    ok: true,
    subscribers: subscribers.length,
    sent,
    skippedWindow,
    skippedIdempotent,
    skippedEmpty,
    errors: errors.slice(0, 20),
    windowMinutes: DIGEST_SEND_WINDOW_MINUTES,
    skipDigestTimeWindow,
    marketSignalsUrl: `${appOrigin.replace(/\/$/, '')}${ROUTES.marketSignals}`,
  })
}

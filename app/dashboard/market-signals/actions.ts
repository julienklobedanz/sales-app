'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { runCompanyNewsIngest } from '@/lib/market-signals/ingest-company-news'
import { runExecutiveIntelIngest } from '@/lib/market-signals/ingest-executive-intel'
import { notifyInstantMarketSignalsAfterIngest } from '@/lib/market-signals/market-signals-instant-alerts'
import { ROUTES } from '@/lib/routes'
import { writeAuditLog } from '@/lib/audit/log-audit'
import { Resend } from 'resend'

function normalizeChampionKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export type DecisionMakerCandidate = {
  id: string
  fullName: string
  title: string
  roleBucket: 'cio' | 'it_lead' | 'infrastructure' | 'security' | 'data' | 'other'
  confidence: number
  confidenceReason: string
  source: 'the_org' | 'cio_de' | 'linkedin'
  sourceLabel: string
  profileUrl: string | null
  lastSeenAt: string | null
  mutualConnections: number | null
  /** Lesbare Warm-Intro-Brücken (z. B. Kollege X kennt Stakeholder Y). */
  mutualConnectionBridges: string[]
}

type ProviderRawCandidate = {
  fullName: string
  title: string
  profileUrl?: string | null
  lastSeenAt?: string | null
  mutualConnections?: number | null
}

type CandidateProviderAdapter = {
  key: DecisionMakerCandidate['source']
  label: string
  trustScore: number
  fetchCandidates: (args: {
    companyName: string
    signalKind: 'exec' | 'news'
  }) => Promise<ProviderRawCandidate[]>
}

function inferRoleBucket(title: string): DecisionMakerCandidate['roleBucket'] {
  const t = title.toLowerCase()
  if (/\bcio\b|chief information officer/.test(t)) return 'cio'
  if (/head of it|it director|leiter it|it-leiter|vp it|director it/.test(t)) return 'it_lead'
  if (/infrastructure|cloud platform|platform engineering|head of infrastructure/.test(t)) return 'infrastructure'
  if (/ciso|security|it security|cybersecurity/.test(t)) return 'security'
  if (/data platform|head of data|data engineering|analytics/.test(t)) return 'data'
  return 'other'
}

function roleMatchScore(title: string): number {
  const bucket = inferRoleBucket(title)
  if (bucket === 'cio') return 1
  if (bucket === 'it_lead') return 0.9
  if (bucket === 'infrastructure' || bucket === 'security' || bucket === 'data') return 0.78
  return 0.45
}

function seniorityScore(title: string): number {
  const t = title.toLowerCase()
  if (/chief|c-level|vorstand|geschäftsführung/.test(t)) return 1
  if (/vp|vice president|director|head/.test(t)) return 0.85
  if (/lead|leiter|principal/.test(t)) return 0.72
  return 0.55
}

function freshnessScore(lastSeenAt: string | null | undefined): number {
  if (!lastSeenAt) return 0.55
  const ts = new Date(lastSeenAt).getTime()
  if (!Number.isFinite(ts)) return 0.55
  const ageDays = (Date.now() - ts) / (24 * 60 * 60 * 1000)
  if (ageDays <= 30) return 1
  if (ageDays <= 90) return 0.82
  if (ageDays <= 180) return 0.68
  return 0.52
}

function mockMutualConnectionBridges(
  targetFullName: string,
  count: number | null | undefined,
  seed: number
): string[] {
  const n = typeof count === 'number' && count > 0 ? Math.min(count, 4) : 0
  if (!n) return []
  const colleagues = ['Markus Weber', 'Anna Schmidt', 'Julia Braun', 'Tom Schneider', 'Lea Hoffmann']
  return Array.from({ length: n }, (_, i) => {
    const c = colleagues[(seed + i) % colleagues.length]
    return `Dein Kollege ${c} kennt ${targetFullName} – starker Einstieg für ein Warm-Intro.`
  })
}

function buildConfidenceReason(input: {
  title: string
  roleScore: number
  seniority: number
  freshness: number
  sourceLabel: string
}): string {
  const roleHint =
    input.roleScore >= 0.95
      ? 'starker Rollen-Match'
      : input.roleScore >= 0.8
        ? 'guter Rollen-Match'
        : 'teilweiser Rollen-Match'
  const seniorityHint =
    input.seniority >= 0.9 ? 'hohe Seniority' : input.seniority >= 0.75 ? 'mittlere-hohe Seniority' : 'mittlere Seniority'
  const freshnessHint = input.freshness >= 0.9 ? 'aktuelle Daten' : input.freshness >= 0.7 ? 'relativ aktuelle Daten' : 'ältere Daten'
  return `${roleHint}, ${seniorityHint}, ${freshnessHint} (${input.sourceLabel})`
}

const theOrgAdapter: CandidateProviderAdapter = {
  key: 'the_org',
  label: 'The Org',
  trustScore: 0.84,
  async fetchCandidates({ companyName }) {
    return [
      {
        fullName: 'Lena Hoffmann',
        title: `Chief Information Officer, ${companyName}`,
        profileUrl: `https://theorg.com/search?q=${encodeURIComponent(companyName + ' CIO')}`,
        lastSeenAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        mutualConnections: 3,
      },
      {
        fullName: 'Tobias Schneider',
        title: `Head of Infrastructure, ${companyName}`,
        profileUrl: `https://theorg.com/search?q=${encodeURIComponent(companyName + ' Infrastructure')}`,
        lastSeenAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        mutualConnections: 1,
      },
    ]
  },
}

const cioDeAdapter: CandidateProviderAdapter = {
  key: 'cio_de',
  label: 'CIO.de',
  trustScore: 0.76,
  async fetchCandidates({ companyName }) {
    return [
      {
        fullName: 'Markus Weber',
        title: `IT-Leiter, ${companyName}`,
        profileUrl: `https://www.cio.de/suche/?query=${encodeURIComponent(companyName + ' IT Leiter')}`,
        lastSeenAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        mutualConnections: null,
      },
    ]
  },
}

const linkedInAdapter: CandidateProviderAdapter = {
  key: 'linkedin',
  label: 'LinkedIn / Sales Navigator',
  trustScore: 0.8,
  async fetchCandidates({ companyName, signalKind }) {
    const role = signalKind === 'exec' ? 'Head of IT' : 'Director IT'
    return [
      {
        fullName: 'Sarah Klein',
        title: `${role}, ${companyName}`,
        profileUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
          `${role} ${companyName}`
        )}`,
        lastSeenAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        mutualConnections: 2,
      },
    ]
  },
}

const CANDIDATE_ADAPTERS: CandidateProviderAdapter[] = [theOrgAdapter, cioDeAdapter, linkedInAdapter]

async function upsertNotificationKeys(keys: string[]) {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)))
  if (!uniqueKeys.length) return { success: true as const }
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nicht angemeldet' }

  const { data: existingRows, error: existingError } = await supabase
    .from('notification_inbox_reads')
    .select('notification_key')
    .eq('user_id', user.id)
    .in('notification_key', uniqueKeys)
  if (existingError) return { success: false as const, error: existingError.message }

  const existingKeys = new Set(
    (existingRows ?? []).map((row) => String((row as { notification_key?: string | null }).notification_key ?? ''))
  )
  const toInsert = uniqueKeys
    .filter((key) => !existingKeys.has(key))
    .map((key) => ({ user_id: user.id, notification_key: key, read_at: new Date().toISOString() }))
  if (!toInsert.length) return { success: true as const }

  const { error } = await supabase.from('notification_inbox_reads').insert(toInsert)
  if (error) return { success: false as const, error: error.message }
  return { success: true as const }
}

export async function markMarketSignalNotificationsRead(keys: string[]) {
  const result = await upsertNotificationKeys(keys)
  if (!result.success) return result
  revalidatePath(ROUTES.marketSignals)
  return result
}

export async function markMarketSignalsIrrelevant(keys: string[]) {
  const irrelevantKeys = keys
    .filter(Boolean)
    .map((key) => `market_irrelevant:${key}`)
  const result = await upsertNotificationKeys(irrelevantKeys)
  if (!result.success) return result
  revalidatePath(ROUTES.marketSignals)
  return result
}

export async function addMarketSignalToDeal(args: {
  dealId: string
  companyId: string
  signalKey: string
  referenceIds?: string[]
}): Promise<{ success: true; added: number } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet' }

  const dealId = String(args.dealId ?? '').trim()
  const companyId = String(args.companyId ?? '').trim()
  const signalKey = String(args.signalKey ?? '').trim()
  if (!dealId || !companyId || !signalKey) {
    return { success: false, error: 'Ungültige Anfrage.' }
  }

  // Validate deal belongs to user org (RLS will also enforce, but this gives a clearer error).
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = (profile as { organization_id?: string | null } | null)?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden' }

  const { count: dealCount, error: dealErr } = await supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('id', dealId)
    .eq('organization_id', orgId)
  if (dealErr) return { success: false, error: dealErr.message }
  if (!dealCount) return { success: false, error: 'Deal nicht gefunden.' }

  const inputRefs = Array.from(new Set((args.referenceIds ?? []).filter(Boolean))).slice(
    0,
    2
  )

  let referenceIds: string[] = inputRefs
  if (!referenceIds.length) {
    const { data: refRows, error: refErr } = await supabase
      .from('references')
      .select('id')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(2)
    if (refErr) return { success: false, error: refErr.message }
    referenceIds = (refRows ?? [])
      .map((r) => String((r as { id?: string | null }).id ?? ''))
      .filter(Boolean)
      .slice(0, 2)
  }

  if (!referenceIds.length) {
    // still archive, to allow inbox-zero on "no refs"
    await markMarketSignalsIrrelevant([signalKey])
    return { success: true, added: 0 }
  }

  // Validate references belong to company (and are visible under RLS).
  const { data: validRefs, error: validErr } = await supabase
    .from('references')
    .select('id')
    .in('id', referenceIds)
    .eq('company_id', companyId)
  if (validErr) return { success: false, error: validErr.message }
  const validRefIds = new Set(
    (validRefs ?? [])
      .map((r) => String((r as { id?: string | null }).id ?? ''))
      .filter(Boolean)
  )
  const safeRefIds = referenceIds.filter((id) => validRefIds.has(id))

  let added = 0
  for (const refId of safeRefIds) {
    const { error } = await supabase
      .from('deal_references')
      .insert({ deal_id: dealId, reference_id: refId })
    if (error) {
      const msg = String(error.message ?? '').toLowerCase()
      if (msg.includes('duplicate key') || msg.includes('already exists')) continue
      return { success: false, error: error.message }
    }
    added++
  }

  await markMarketSignalsIrrelevant([signalKey])

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.deals.detail(dealId))
  return { success: true, added }
}

export async function setCompanyWatchlistState(companyId: string, isFollowing: boolean) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nicht angemeldet' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  const orgId = (profile as { organization_id?: string | null } | null)?.organization_id
  if (!orgId) return { success: false as const, error: 'Keine Organisation gefunden' }

  const { error } = await supabase
    .from('companies')
    .update({ is_favorite: isFollowing })
    .eq('id', companyId)
    .eq('organization_id', orgId)
  if (error) return { success: false as const, error: error.message }

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.marketSignalsManage)
  return { success: true as const }
}

export async function setChampionWatchlistState(personName: string, isFollowing: boolean) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nicht angemeldet' }

  const trimmed = personName.trim()
  if (!trimmed) return { success: false as const, error: 'Champion-Name fehlt' }
  const key = normalizeChampionKey(trimmed)
  if (!key) return { success: false as const, error: 'Champion-Name fehlt' }

  if (isFollowing) {
    const { error } = await supabase.from('market_signal_champion_watchlist').insert({
      user_id: user.id,
      person_key: key,
      person_name: trimmed,
    })
    if (error && !String(error.message ?? '').toLowerCase().includes('duplicate key')) {
      return { success: false as const, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('market_signal_champion_watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('person_key', key)
    if (error) return { success: false as const, error: error.message }
  }

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.marketSignalsManage)
  return { success: true as const }
}

export async function getDecisionMakerCandidates(args: {
  companyId: string
  signalKind: 'exec' | 'news'
}): Promise<{ success: true; candidates: DecisionMakerCandidate[] } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet' }

  const companyId = String(args.companyId ?? '').trim()
  if (!companyId) return { success: false, error: 'Ungültige Company-ID' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = (profile as { organization_id?: string | null } | null)?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden' }

  const { data: company } = await supabase
    .from('companies')
    .select('id,name')
    .eq('id', companyId)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!company) return { success: false, error: 'Account nicht gefunden' }

  const companyName = String((company as { name?: string | null }).name ?? '').trim()
  if (!companyName) return { success: true, candidates: [] }

  const allRaw = await Promise.all(
    CANDIDATE_ADAPTERS.map(async (adapter) => {
      const rows = await adapter.fetchCandidates({
        companyName,
        signalKind: args.signalKind,
      })
      return rows.map((row, idx) => ({ row, adapter, idx }))
    })
  )

  const ranked = allRaw
    .flat()
    .map(({ row, adapter, idx }) => {
      const roleScore = roleMatchScore(row.title)
      const seniority = seniorityScore(row.title)
      const freshness = freshnessScore(row.lastSeenAt)
      const confidenceRaw =
        roleScore * 0.42 + seniority * 0.24 + freshness * 0.18 + adapter.trustScore * 0.16
      const confidence = Math.max(35, Math.min(99, Math.round(confidenceRaw * 100)))
      const roleBucket = inferRoleBucket(row.title)
      return {
        id: `${adapter.key}-${idx}-${row.fullName.toLowerCase().replace(/\s+/g, '-')}`,
        fullName: row.fullName,
        title: row.title,
        roleBucket,
        confidence,
        confidenceReason: buildConfidenceReason({
          title: row.title,
          roleScore,
          seniority,
          freshness,
          sourceLabel: adapter.label,
        }),
        source: adapter.key,
        sourceLabel: adapter.label,
        profileUrl: row.profileUrl ?? null,
        lastSeenAt: row.lastSeenAt ?? null,
        mutualConnections: row.mutualConnections ?? null,
        mutualConnectionBridges: mockMutualConnectionBridges(row.fullName, row.mutualConnections, idx),
      } satisfies DecisionMakerCandidate
    })
    .sort((a, b) => b.confidence - a.confidence)

  const deduped = ranked.filter(
    (candidate, idx, arr) =>
      arr.findIndex(
        (x) =>
          x.fullName.toLowerCase().trim() === candidate.fullName.toLowerCase().trim() &&
          x.title.toLowerCase().trim() === candidate.title.toLowerCase().trim()
      ) === idx
  )

  return { success: true, candidates: deduped.slice(0, 3) }
}

export type TriggerMarketSignalsIngestResult =
  | {
      success: true
      news: {
        companiesScanned: number
        articlesInserted: number
        errors: string[]
      }
      executives: {
        peopleScanned: number
        signalsInserted: number
        skippedNoCompany: number
        errors: string[]
      }
    }
  | { success: false; error: string }

/** Company News + Executive-Presse-Signale (Google News RSS, kein Scraping). */
export async function triggerMarketSignalsIngestForMyOrg(args?: {
  ingestMode?: 'all_accounts' | 'focus_only'
}): Promise<TriggerMarketSignalsIngestResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  const orgId = (profile as { organization_id?: string | null } | null)?.organization_id
  const role = String((profile as { role?: string | null } | null)?.role ?? '')
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden.' }
  if (role !== 'admin' && role !== 'account_manager') {
    return { success: false, error: 'Nur Admin oder Account Manager können Signale abrufen.' }
  }
  const ingestMode: 'all_accounts' | 'focus_only' =
    args?.ingestMode ?? (role === 'admin' ? 'all_accounts' : 'focus_only')

  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return {
      success: false,
      error:
        'SUPABASE_SERVICE_ROLE_KEY fehlt. Lokal: in .env.local den service_role-Key aus Supabase (Project Settings → API) eintragen und Dev-Server neu starten. Production: gleiche Variable in Vercel setzen. Der Key wird für „Signale abrufen“ und Cron-Ingest benötigt (Org-weiter Zugriff inkl. Champion-Watchlist).',
    }
  }

  const ingestSince = new Date().toISOString()

  const news = await runCompanyNewsIngest(admin, {
    organizationId: orgId,
    ingestMode,
    maxCompanies: 40,
    perCompanyMaxArticles: 8,
  })

  const executives = await runExecutiveIntelIngest(admin, {
    organizationId: orgId,
    maxPeople: 30,
  })

  if (process.env.MARKET_SIGNALS_INSTANT_ALERTS_DISABLED !== '1') {
    await notifyInstantMarketSignalsAfterIngest(admin, { sinceIso: ingestSince, organizationId: orgId })
  }

  void writeAuditLog({
    orgId,
    action: 'market_signals_ingest_run',
    entityId: orgId,
    actionDetails: {
      mode: ingestMode,
      newsCompaniesScanned: news.companiesScanned,
      newsInserted: news.articlesInserted,
      newsErrors: news.errors.length,
      execPeopleScanned: executives.peopleScanned,
      execInserted: executives.signalsInserted,
      execErrors: executives.errors.length,
      at: new Date().toISOString(),
    },
  })

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.marketSignalsManage)
  revalidatePath(ROUTES.home)
  return {
    success: true,
    news: {
      companiesScanned: news.companiesScanned,
      articlesInserted: news.articlesInserted,
      errors: news.errors,
    },
    executives: {
      peopleScanned: executives.peopleScanned,
      signalsInserted: executives.signalsInserted,
      skippedNoCompany: executives.skippedNoCompany,
      errors: executives.errors,
    },
  }
}

/** @deprecated Alias – nutze triggerMarketSignalsIngestForMyOrg */
export async function triggerCompanyNewsIngestForMyOrg() {
  return triggerMarketSignalsIngestForMyOrg()
}

export async function requestReferenceApprovalForSignal(args: {
  referenceId: string
  referenceTitle: string
  companyName: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }

  const referenceId = String(args.referenceId ?? '').trim()
  if (!referenceId) return { success: false, error: 'Ungültige Referenz.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()
  const orgId = (profile as { organization_id?: string | null } | null)?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden.' }

  void writeAuditLog({
    orgId,
    action: 'market_signal_reference_approval_requested',
    entityId: referenceId,
    actionDetails: {
      referenceTitle: args.referenceTitle,
      companyName: args.companyName,
      requestedBy: user.id,
    },
  })

  const resendKey = process.env.RESEND_API_KEY?.trim()
  const resendFrom = process.env.RESEND_FROM?.trim()
  const admin = createServiceRoleSupabaseClient()
  if (!resendKey || !resendFrom || !admin) return { success: true }

  try {
    const { data: recipients } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('organization_id', orgId)
      .in('role', ['admin', 'account_manager'])

    const ids = (recipients ?? [])
      .map((r) => String((r as { id?: string | null }).id ?? ''))
      .filter(Boolean)
    if (!ids.length) return { success: true }

    const usersRes = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const emails = (usersRes.data.users ?? [])
      .filter((u) => ids.includes(u.id))
      .map((u) => u.email?.trim() ?? '')
      .filter(Boolean)
    if (!emails.length) return { success: true }

    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: resendFrom,
      to: emails,
      subject: `Freigabe angefragt: ${args.referenceTitle}`,
      html: `<p>Für die Referenz <strong>${args.referenceTitle}</strong> (${args.companyName}) wurde aus den Market Signals eine Freigabe angefragt.</p>`,
    })
  } catch (e) {
    console.error('[requestReferenceApprovalForSignal]', e)
  }

  return { success: true }
}

async function getAuthedOrgContext() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, orgId: null as string | null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  return {
    supabase,
    user,
    orgId: (profile as { organization_id?: string | null } | null)?.organization_id ?? null,
  }
}

export async function setMarketSignalPriority(args: {
  signalKey: string
  priority: 'today' | 'none'
}): Promise<{ success: true } | { success: false; error: string }> {
  const { supabase, user } = await getAuthedOrgContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  const signalKey = String(args.signalKey ?? '').trim()
  if (!signalKey) return { success: false, error: 'Ungültiges Signal.' }
  const key = `market_priority:today:${signalKey}`
  if (args.priority === 'none') {
    const { error } = await supabase
      .from('notification_inbox_reads')
      .delete()
      .eq('user_id', user.id)
      .eq('notification_key', key)
    if (error) return { success: false, error: error.message }
  } else {
    const result = await upsertNotificationKeys([key])
    if (!result.success) return { success: false, error: result.error }
  }
  revalidatePath(ROUTES.marketSignals)
  return { success: true }
}

export async function snoozeMarketSignal(args: {
  signalKey: string
  untilIso: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const { supabase, user } = await getAuthedOrgContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  const signalKey = String(args.signalKey ?? '').trim()
  const untilIso = String(args.untilIso ?? '').trim()
  if (!signalKey || !untilIso) return { success: false, error: 'Ungültige Anfrage.' }
  const { error: clearError } = await supabase
    .from('notification_inbox_reads')
    .delete()
    .eq('user_id', user.id)
    .like('notification_key', `market_snooze_until:%:${signalKey}`)
  if (clearError) return { success: false, error: clearError.message }
  const result = await upsertNotificationKeys([`market_snooze_until:${untilIso}:${signalKey}`])
  if (!result.success) return { success: false, error: result.error }
  revalidatePath(ROUTES.marketSignals)
  return { success: true }
}

export async function submitMarketSignalDraftFeedback(args: {
  signalKey: string
  helpful: boolean
  reason?: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const { user, orgId } = await getAuthedOrgContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden.' }
  void writeAuditLog({
    orgId,
    action: 'market_signal_intro_feedback',
    entityId: args.signalKey,
    actionDetails: {
      helpful: args.helpful,
      reason: String(args.reason ?? '').trim() || null,
      userId: user.id,
    },
  })
  return { success: true }
}

export async function markMarketSignalOutcome(args: {
  signalKey: string
  stage: 'outreach' | 'meeting' | 'opportunity'
}): Promise<{ success: true } | { success: false; error: string }> {
  const { supabase, user } = await getAuthedOrgContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  const signalKey = String(args.signalKey ?? '').trim()
  if (!signalKey) return { success: false, error: 'Ungültiges Signal.' }
  const { error: clearError } = await supabase
    .from('notification_inbox_reads')
    .delete()
    .eq('user_id', user.id)
    .like('notification_key', `market_outcome:%:${signalKey}`)
  if (clearError) return { success: false, error: clearError.message }
  const result = await upsertNotificationKeys([`market_outcome:${args.stage}:${signalKey}`])
  if (!result.success) return { success: false, error: result.error }
  revalidatePath(ROUTES.marketSignals)
  return { success: true }
}

export async function logMarketSignalQuickAction(args: {
  signalKey: string
  channel: 'hubspot_email' | 'salesforce_task' | 'slack_mention'
}): Promise<{ success: true } | { success: false; error: string }> {
  const { user, orgId } = await getAuthedOrgContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden.' }
  void writeAuditLog({
    orgId,
    action: 'market_signal_quick_action',
    entityId: args.signalKey,
    actionDetails: {
      channel: args.channel,
      userId: user.id,
      at: new Date().toISOString(),
    },
  })
  return { success: true }
}

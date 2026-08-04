import { createServerSupabaseClient } from '@/lib/supabase/server'
import { resolveAuthEmailsByUserIds } from '@/lib/auth/resolve-user-emails'
import { writeAuditLog } from '@/lib/audit/log-audit'
import { Resend } from 'resend'
import {
  buildRefstackEmailHtml,
  buildReferenceMetaRows,
  getRefstackResendFrom,
} from '@/lib/email/refstack-email-layout'
import { getAppOrigin } from '@/lib/env/app-origin'
import { log } from '@/lib/observability/logger'
import { isSystemAdmin } from '@/lib/roles/legacy-mapping'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { ROUTES } from '@/lib/routes'
import type {
  DecisionMakerCandidate,
  SignalReferenceMatchPayload,
} from './market-signal-action-types'

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
  if (/head of it|it director|leiter it|it-leiter|vp it|director it/.test(t))
    return 'it_lead'
  if (/infrastructure|cloud platform|platform engineering|head of infrastructure/.test(t))
    return 'infrastructure'
  if (/ciso|security|it security|cybersecurity/.test(t)) return 'security'
  if (/data platform|head of data|data engineering|analytics/.test(t)) return 'data'
  return 'other'
}

function roleMatchScore(title: string): number {
  const bucket = inferRoleBucket(title)
  if (bucket === 'cio') return 1
  if (bucket === 'it_lead') return 0.9
  if (bucket === 'infrastructure' || bucket === 'security' || bucket === 'data')
    return 0.78
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
  seed: number,
): string[] {
  const n = typeof count === 'number' && count > 0 ? Math.min(count, 4) : 0
  if (!n) return []
  const colleagues = [
    'Markus Weber',
    'Anna Schmidt',
    'Julia Braun',
    'Tom Schneider',
    'Lea Hoffmann',
  ]
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
    input.seniority >= 0.9
      ? 'hohe Seniority'
      : input.seniority >= 0.75
        ? 'mittlere-hohe Seniority'
        : 'mittlere Seniority'
  const freshnessHint =
    input.freshness >= 0.9
      ? 'aktuelle Daten'
      : input.freshness >= 0.7
        ? 'relativ aktuelle Daten'
        : 'ältere Daten'
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
          `${role} ${companyName}`,
        )}`,
        lastSeenAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        mutualConnections: 2,
      },
    ]
  },
}

const CANDIDATE_ADAPTERS: CandidateProviderAdapter[] = [
  theOrgAdapter,
  cioDeAdapter,
  linkedInAdapter,
]

export async function getDecisionMakerCandidatesImpl(args: {
  companyId: string
  signalKind: 'exec' | 'news'
}): Promise<
  | { success: true; candidates: DecisionMakerCandidate[] }
  | { success: false; error: string }
> {
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
    }),
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
        mutualConnectionBridges: mockMutualConnectionBridges(
          row.fullName,
          row.mutualConnections,
          idx,
        ),
      } satisfies DecisionMakerCandidate
    })
    .sort((a, b) => b.confidence - a.confidence)

  const deduped = ranked.filter(
    (candidate, idx, arr) =>
      arr.findIndex(
        (x) =>
          x.fullName.toLowerCase().trim() === candidate.fullName.toLowerCase().trim() &&
          x.title.toLowerCase().trim() === candidate.title.toLowerCase().trim(),
      ) === idx,
  )

  return { success: true, candidates: deduped.slice(0, 3) }
}

export async function requestReferenceApprovalForSignalImpl(args: {
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
    .select('organization_id')
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
  if (!resendKey) return { success: true }

  try {
    const { data: recipients } = await supabase
      .from('profiles')
      .select('id, system_role, function_role')
      .eq('organization_id', orgId)

    const ids = (recipients ?? [])
      .filter((r) => {
        const { systemRole, functionRole } = parseProfileRoles(r)
        return isSystemAdmin(systemRole) || functionRole === 'account_manager'
      })
      .map((r) => r.id)
      .filter(Boolean)
    if (!ids.length) return { success: true }

    // Grenze: nur User-IDs der eigenen Org; E-Mails per auth.admin.getUserById (kein listUsers).
    const emailByUserId = await resolveAuthEmailsByUserIds(ids)
    const emails = ids.map((id) => emailByUserId.get(id) ?? '').filter(Boolean)
    if (!emails.length) return { success: true }

    const resend = new Resend(resendKey)
    const detailUrl = `${getAppOrigin()}${ROUTES.references.detail(referenceId)}`
    const html = buildRefstackEmailHtml({
      audience: 'internal',
      badge: 'Freigabe angefragt',
      bodyHtml:
        '<p style="margin:0;">Aus den Market Signals wurde eine Freigabe für diese Referenz angefragt.</p>',
      meta: { rows: buildReferenceMetaRows(args.referenceTitle, args.companyName) },
      ctas: [{ label: 'Referenz öffnen', href: detailUrl }],
    })
    await resend.emails.send({
      from: getRefstackResendFrom(),
      to: emails,
      subject: `Freigabe angefragt: ${args.referenceTitle}`,
      html,
    })
  } catch (e) {
    log.error('requestReferenceApprovalForSignal.failed', {}, e)
  }

  return { success: true }
}

/**
 * Semantische „Hochzeit“: Signal-Text → Top-Referenzen aus der Org-Bibliothek.
 * Dedupliziert gleiche Queries; begrenzt Parallelität.
 */
export async function matchReferencesForSignalsImpl(
  signals: SignalReferenceMatchPayload[],
): Promise<
  | {
      success: true
      byKey: Record<
        string,
        import('@/lib/market-signals/signal-reference-match').SignalMatchHit[]
      >
    }
  | { success: false; error: string }
> {
  const list = signals
    .map((s) => ({
      key: String(s.key ?? '').trim(),
      query: String(s.query ?? '').trim(),
      excludeCompanyId: s.excludeCompanyId?.trim() || null,
    }))
    .filter((s) => s.key && s.query.length >= 8)
    .slice(0, 20)

  if (!list.length) {
    return { success: true, byKey: {} }
  }

  const { matchReferencesImpl } = await import('@/lib/references/library/match')
  const { toSignalMatchHit } = await import('@/lib/market-signals/signal-reference-match')

  const uniqueQueries = Array.from(new Set(list.map((s) => s.query)))
  const hitsByQuery = new Map<string, Awaited<ReturnType<typeof matchReferencesImpl>>>()

  const CONCURRENCY = 3
  for (let i = 0; i < uniqueQueries.length; i += CONCURRENCY) {
    const chunk = uniqueQueries.slice(i, i + CONCURRENCY)
    await Promise.all(
      chunk.map(async (query) => {
        const result = await matchReferencesImpl(query, undefined, {
          matchThreshold: 0.35,
          matchCount: 6,
          rerank: false,
        })
        hitsByQuery.set(query, result)
      }),
    )
  }

  const byKey: Record<
    string,
    import('@/lib/market-signals/signal-reference-match').SignalMatchHit[]
  > = {}

  for (const item of list) {
    const result = hitsByQuery.get(item.query)
    if (!result || !result.success) {
      byKey[item.key] = []
      continue
    }
    let hits = result.matches
      .filter(
        (m) =>
          !item.excludeCompanyId || !m.companyId || m.companyId !== item.excludeCompanyId,
      )
      .map(toSignalMatchHit)
    if (hits.length === 0) {
      hits = result.matches.map(toSignalMatchHit)
    }
    byKey[item.key] = hits.slice(0, 3)
  }

  return { success: true, byKey }
}

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toggleFavorite } from '@/app/dashboard/actions'
import {
  Building2,
  Globe,
  LinkIcon,
  Mail,
  MapPinIcon,
  Pencil,
  Sparkles,
  StarIcon,
  TrendingUp,
  UploadIcon,
  Users,
} from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { formatDateUtcDe, formatReferenceVolume } from '@/lib/format'
import { deleteReferenceFromDetailPage } from './actions'
import { ReferenceStatusBadge } from '@/components/reference-status-badge'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { PdfExportDialog } from './pdf-export-dialog'
import { PptxOnepagerExportButton } from './pptx-onepager-export-button'
import { ShareLinkButton } from './share-link-button'
import { RequestApprovalDialog } from './request-approval-dialog'
import { ReferenceViewedTracker } from './reference-viewed-tracker'
import { getReferenceUsageStats } from '@/app/dashboard/references/reference-usage-stats'
import { ApprovalPendingActions } from './approval-pending-actions'
import { getReferenceDetailActivities } from './reference-detail-activities'
import { ReferenceActivitiesTimeline } from './reference-activities-timeline'
import { ReferenceContextHighlighted } from '@/components/reference-context-highlighted'
import {
  buildReferenceHighlightPhrases,
  extractWorkflowHighlightGlossary,
} from '@/lib/references/reference-context-highlights'
import { normalizeNarrativeText } from '@/lib/references/narrative-normalize'
import { getReferenceAssetsImpl } from '@/app/dashboard/references/assets'

export const dynamic = 'force-dynamic'

function splitTags(tags: string | null) {
  return (tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function anonymizeText(value: string | null | undefined, companyName: string | null | undefined) {
  const text = String(value ?? '')
  const normalizedCompany = String(companyName ?? '').trim()
  if (!text) return text
  if (!normalizedCompany) return text
  const escaped = normalizedCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'gi'), 'Kunde')
}

function firstSentence(value: string | null | undefined) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (!text) return null
  const match = text.match(/.+?[.!?](?:\s|$)/)
  return (match ? match[0] : text).trim()
}

export default async function EvidenceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const qs = await searchParams

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()
  if (!profile) redirect(ROUTES.onboarding)

  const role = (profile as { role?: 'admin' | 'sales' | 'account_manager' }).role ?? 'sales'
  const organizationId = (profile as { organization_id?: string | null }).organization_id ?? null

  const { data: row, error } = await supabase
    .from('references')
    .select(
      `
      id,
      title,
      summary,
      industry,
      country,
      status,
      contact_id,
      customer_contact_id,
      customer_approval_status,
      approval_owner_name,
      approval_expires_at,
      approval_scope_named_mention,
      approval_scope_anonymous_mention,
      approval_scope_reference_call,
      approval_scope_logo_use,
      approval_scope_press_release,
      approval_grace_until,
      approval_internal_status,
      approval_contact_id,
      approval_external_contact_id,
      approval_reference_giver_name,
      approval_reference_giver_title,
      approval_competitor_blacklist,
      approval_quote_proposed,
      approval_quote_approved,
      approval_consent_file_url,
      anonymized_from_id,
      tags,
      created_at,
      updated_at,
      customer_challenge,
      our_solution,
      volume_eur,
      contract_type,
      project_start,
      project_end,
      project_status,
      employee_count,
      is_nda_deal,
      file_path,
      incumbent_provider,
      competitors,
      website,
      companies ( id, name, headquarters, website_url, employee_count )
    `
    )
    .eq('id', id)
    .single()

  if (error || !row) notFound()

  type CompanyRow = {
    id: string
    name: string
    headquarters?: string | null
    website_url?: string | null
    employee_count?: number | null
  }
  type ReferenceDetailRow = {
    id: string
    title: string
    summary: string | null
    industry: string | null
    country: string | null
    status: string
    contact_id: string | null
    customer_contact_id: string | null
    customer_approval_status: string | null
    approval_owner_name: string | null
    approval_expires_at: string | null
    approval_scope_named_mention: boolean | null
    approval_scope_anonymous_mention: boolean | null
    approval_scope_reference_call: boolean | null
    approval_scope_logo_use: boolean | null
    approval_scope_press_release: boolean | null
    approval_grace_until: string | null
    approval_internal_status: string | null
    approval_contact_id: string | null
    approval_external_contact_id: string | null
    approval_reference_giver_name: string | null
    approval_reference_giver_title: string | null
    approval_competitor_blacklist: string[] | null
    approval_quote_proposed: string | null
    approval_quote_approved: string | null
    approval_consent_file_url: string | null
    anonymized_from_id: string | null
    created_at: string | null
    updated_at: string | null
    tags: string | null
    customer_challenge: string | null
    our_solution: string | null
    customer_contact: string | null
    volume_eur: string | null
    contract_type: string | null
    project_start: string | null
    project_end: string | null
    project_status: string | null
    employee_count: number | null
    is_nda_deal: boolean | null
    file_path: string | null
    incumbent_provider: string | null
    competitors: string | null
    website: string | null
    companies: CompanyRow | CompanyRow[] | null
  }

  const ref = row as unknown as ReferenceDetailRow

  const normalizedStatus = String(ref.status ?? '').toLowerCase()
  if (
    role === 'sales' &&
    !(
      normalizedStatus === 'approved' ||
      normalizedStatus === 'internal_only' ||
      normalizedStatus === 'anonymized' ||
      normalizedStatus === 'external' ||
      normalizedStatus === 'internal'
    )
  ) {
    notFound()
  }

  const { data: favorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('reference_id', id)
    .maybeSingle()

  const isFavorited = Boolean(favorite?.id)
  const usageStats = await getReferenceUsageStats(id)
  const ev = usageStats?.events ?? {}
  const n = (key: string) => ev[key] ?? 0
  const tags = splitTags(ref.tags ?? null)
  const company = Array.isArray(ref.companies) ? ref.companies[0] : ref.companies
  const isAnonymizedView = qs?.view === 'anonymized'
  const companyName = company?.name ?? null
  const headerCompany = isAnonymizedView ? 'Kunde' : companyName
  const industryLabel = anonymizeText(ref.industry ?? null, companyName)
  const refEmployeeRaw = ref.employee_count ?? company?.employee_count ?? null
  const employeeMetaLabel =
    typeof refEmployeeRaw === 'number' && Number.isFinite(refEmployeeRaw)
      ? new Intl.NumberFormat('de-DE').format(refEmployeeRaw)
      : null
  const hqRaw = (company?.headquarters ?? '').trim()
  const countryRaw = (ref.country ?? '').trim()
  const locationLineRaw = hqRaw || countryRaw || null
  const locationMetaLabel = locationLineRaw
    ? isAnonymizedView
      ? anonymizeText(locationLineRaw, companyName)
      : locationLineRaw
    : null
  const websiteRaw = (ref.website ?? '').trim() || (company?.website_url ?? '').trim()
  const websiteMetaHref =
    !isAnonymizedView && websiteRaw
      ? websiteRaw.startsWith('http')
        ? websiteRaw
        : `https://${websiteRaw}`
      : null
  const summaryTextRaw = isAnonymizedView
    ? anonymizeText(ref.summary ?? null, companyName)
    : (ref.summary ?? null)
  const challengeTextRaw = isAnonymizedView
    ? anonymizeText(ref.customer_challenge ?? null, companyName)
    : (ref.customer_challenge ?? null)
  const solutionTextRaw = isAnonymizedView
    ? anonymizeText(ref.our_solution ?? null, companyName)
    : (ref.our_solution ?? null)
  const summaryText = normalizeNarrativeText(summaryTextRaw)
  const challengeText = normalizeNarrativeText(challengeTextRaw)
  const solutionText = normalizeNarrativeText(solutionTextRaw)
  const hasSummary = Boolean(summaryText?.trim())
  const hasChallenge = Boolean(challengeText?.trim())
  const hasSolution = Boolean(solutionText?.trim())
  /** 40 % Herausforderung / 60 % Lösung – nur wenn beide Karten da sind (sonst volle Breite). */
  const challengeSolutionGridClass =
    hasChallenge && hasSolution
      ? 'grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
      : 'grid gap-4 md:grid-cols-1'
  const tldrBullets = Array.from(
    new Set([
    firstSentence(summaryText) || firstSentence(challengeText) || 'Kernaussage ist in der Referenz hinterlegt.',
    firstSentence(challengeText) || 'Die zentrale Herausforderung ist dokumentiert.',
    firstSentence(solutionText) || firstSentence(summaryText) || 'Die umgesetzte Lösung ist dokumentiert.',
    ])
  )
    .filter(Boolean)
    .slice(0, 3)
  const outcomeText = normalizeNarrativeText(
    firstSentence(summaryText) ||
      `Diese Referenz zeigt bereits messbare Nutzungssignale (${n('reference_helped')}x als hilfreich markiert).`
  )
  const isApprovalGranted =
    String(ref.customer_approval_status ?? '').toLowerCase() === 'approved' ||
    normalizedStatus === 'approved' ||
    normalizedStatus === 'external'
  const nowMs = new Date().getTime()
  const expiresMs = ref.approval_expires_at ? new Date(ref.approval_expires_at).getTime() : null
  const graceMs = ref.approval_grace_until ? new Date(ref.approval_grace_until).getTime() : null
  const baseApprovalStatus = String(ref.customer_approval_status ?? '').toLowerCase()
  const approvalStatus =
    baseApprovalStatus === 'approved' && expiresMs && expiresMs < nowMs && graceMs && graceMs >= nowMs
      ? 'expired'
      : baseApprovalStatus
  const internalApproval = String(ref.approval_internal_status ?? '').toLowerCase()
  /** DB-Hygiene: Status/Kunde schon freigegeben, aber approval_internal_status hängt noch auf pending_internal. */
  const staleInternalPending =
    internalApproval === 'pending_internal' &&
    (isApprovalGranted ||
      normalizedStatus === 'approved' ||
      normalizedStatus === 'external' ||
      normalizedStatus === 'anonymized' ||
      normalizedStatus === 'internal_only' ||
      normalizedStatus === 'internal')

  /** Referenz-Stufe (Sales-Sicht, Portfolio): unabhängig vom Kunden-Freigabe-Workflow. */
  const referenceIsInternalOnly =
    normalizedStatus === 'internal_only' || normalizedStatus === 'internal'

  let readinessLabel: string
  let readinessTone: string

  if (internalApproval === 'pending_internal' && !staleInternalPending) {
    readinessLabel = 'Interne Freigabe ausstehend'
    readinessTone = 'bg-sky-50 text-sky-800 border-sky-200'
  } else if (internalApproval === 'withdrawn_internal') {
    readinessLabel = 'Anfrage widerrufen'
    readinessTone = 'bg-slate-100 text-slate-600 border-slate-200'
  } else if (approvalStatus === 'approved' || staleInternalPending) {
    const customerWorkflowApproved =
      baseApprovalStatus === 'approved' ||
      normalizedStatus === 'approved' ||
      normalizedStatus === 'external'
    readinessLabel =
      referenceIsInternalOnly && customerWorkflowApproved
        ? 'Kundenfreigabe · nur intern nutzbar'
        : referenceIsInternalOnly && !customerWorkflowApproved
          ? 'Einsatzbereit · nur intern'
          : 'Freigegeben'
    readinessTone = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  } else if (approvalStatus === 'pending') {
    readinessLabel = 'Kundenfreigabe läuft'
    readinessTone = 'bg-amber-50 text-amber-700 border-amber-200'
  } else if (approvalStatus === 'rejected') {
    readinessLabel = 'Abgelehnt'
    readinessTone = 'bg-red-50 text-red-700 border-red-200'
  } else if (approvalStatus === 'expired') {
    readinessLabel = 'Grace Period'
    readinessTone = 'bg-orange-50 text-orange-700 border-orange-200'
  } else {
    readinessLabel = 'Nicht angefragt'
    readinessTone = 'bg-slate-100 text-slate-600 border-slate-200'
  }
  const scopeBadges = [
    (ref.approval_scope_named_mention ?? true) ? 'Namentlich' : null,
    (ref.approval_scope_anonymous_mention ?? true) ? 'Anonym' : null,
    (ref.approval_scope_reference_call ?? false) ? 'Referenz-Call' : null,
    (ref.approval_scope_logo_use ?? false) ? 'Logo-Nutzung' : null,
    (ref.approval_scope_press_release ?? false) ? 'Pressemeldung' : null,
  ].filter(Boolean) as string[]
  const competitorBlacklist = Array.isArray(ref.approval_competitor_blacklist)
    ? ref.approval_competitor_blacklist
    : []
  const internalStatus = String(ref.approval_internal_status ?? '')
  const salesReadinessLabel =
    (ref.approval_scope_named_mention ?? true) ? 'Namentlich freigegeben' : 'Anonymisiert nutzen'

  let glossaryFromWorkflow: string[] = []
  if (organizationId) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('workflow_settings')
      .eq('id', organizationId)
      .maybeSingle()
    glossaryFromWorkflow = extractWorkflowHighlightGlossary(orgRow?.workflow_settings)
  }
  const highlightPhrases = buildReferenceHighlightPhrases({
    tags,
    industry: industryLabel,
    incumbentProvider: ref.incumbent_provider,
    competitors: ref.competitors,
    glossary: glossaryFromWorkflow,
  })

  const [referenceActivities, assetRows] = await Promise.all([
    getReferenceDetailActivities(id, role as 'admin' | 'sales' | 'account_manager'),
    getReferenceAssetsImpl(id),
  ])

  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
  const toReferencesPublicUrl = (path: string) =>
    `${publicBase}/storage/v1/object/public/references/${path}`

  type DetailFileRow = { key: string; name: string; href: string; category: string | null }
  const detailFileRows: DetailFileRow[] = assetRows.map((a) => ({
    key: a.id,
    name: a.file_name || a.file_path.split('/').pop() || 'Dokument',
    href: toReferencesPublicUrl(a.file_path),
    category: a.category,
  }))
  const legacyFilePath = (ref.file_path ?? '').trim()
  if (legacyFilePath && !assetRows.some((x) => x.file_path === legacyFilePath)) {
    detailFileRows.unshift({
      key: `legacy-${legacyFilePath}`,
      name: legacyFilePath.split('/').pop() || 'Dokument',
      href: toReferencesPublicUrl(legacyFilePath),
      category: null,
    })
  }

  const filesCard =
    detailFileRows.length > 0 ? (
      <Card className="border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-base inline-flex items-center gap-2">
            <AppIcon icon={UploadIcon} size={16} className="text-muted-foreground" />
            Dateien
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="space-y-2">
            {detailFileRows.map((f) => (
              <li key={f.key} className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate text-muted-foreground">{f.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {f.category ? (
                    <Badge variant="outline" className="text-[10px] font-normal capitalize">
                      {f.category === 'sales'
                        ? 'Sales'
                        : f.category === 'contract'
                          ? 'Vertrag'
                          : 'Sonstiges'}
                    </Badge>
                  ) : null}
                  <a
                    className="text-xs font-medium text-primary hover:underline"
                    href={f.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Öffnen
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    ) : null

  return (
    <div>
      <ReferenceViewedTracker referenceId={id} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ReferenceStatusBadge status={ref.status} customerApprovalStatus={ref.customer_approval_status} />
              </div>
              <h1 className={`${DASHBOARD_PAGE_TITLE_CLASS} break-words`}>
                {ref.title}
              </h1>
              {headerCompany ? (
                <p className="text-sm text-muted-foreground">{headerCompany}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {industryLabel ? (
                  <span className="inline-flex max-w-[min(100%,280px)] items-center gap-1">
                    <AppIcon icon={Building2} size={14} className="shrink-0" />
                    <span className="truncate">{industryLabel}</span>
                  </span>
                ) : null}
                {employeeMetaLabel ? (
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <AppIcon icon={Users} size={14} />
                    {employeeMetaLabel} Mitarbeiter
                  </span>
                ) : null}
                {locationMetaLabel ? (
                  <span className="inline-flex max-w-[min(100%,260px)] items-center gap-1">
                    <AppIcon icon={MapPinIcon} size={14} className="shrink-0" />
                    <span className="truncate">{locationMetaLabel}</span>
                  </span>
                ) : null}
                {websiteMetaHref ? (
                  <a
                    className="inline-flex shrink-0 items-center gap-1 hover:underline"
                    href={websiteMetaHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <AppIcon icon={Globe} size={14} />
                    Website
                  </a>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.length ? (
                  tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {hasSummary || hasChallenge || hasSolution ? (
            <div className="w-full min-w-0 space-y-6">
              <Card className="border-blue-200/70 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-500/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-950 dark:text-slate-100 inline-flex items-center gap-2">
                    <AppIcon icon={Sparkles} size={15} className="text-blue-600 dark:text-blue-300" />
                    Zusammenfassung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {tldrBullets.map((bullet, idx) => (
                      <li key={`${bullet}-${idx}`}>{bullet}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className={challengeSolutionGridClass}>
                {hasChallenge ? (
                  <Card className="border-border/70">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wider text-slate-950 dark:text-slate-100 inline-flex items-center gap-1.5">
                        <AppIcon icon={TrendingUp} size={14} className="text-muted-foreground" />
                        Herausforderung
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        <ReferenceContextHighlighted text={challengeText} phrases={highlightPhrases} />
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
                {hasSolution ? (
                  <Card className="border-border/70">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wider text-slate-950 dark:text-slate-100 inline-flex items-center gap-1.5">
                        <AppIcon icon={LinkIcon} size={14} className="text-muted-foreground" />
                        Lösung
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        <ReferenceContextHighlighted text={solutionText} phrases={highlightPhrases} />
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
                <Card className="border-border/70 col-span-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-wider text-slate-950 dark:text-slate-100 inline-flex items-center gap-1.5">
                      <AppIcon icon={Sparkles} size={14} className="text-muted-foreground" />
                      Ergebnis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <ReferenceContextHighlighted text={outcomeText} phrases={highlightPhrases} />
                    </p>
                  </CardContent>
                </Card>
              </div>
              {role === 'sales' ? filesCard : null}
            </div>
          ) : role === 'sales' && filesCard ? (
            <div className="w-full min-w-0">{filesCard}</div>
          ) : null}

          {role === 'sales' ? null : (
            <>
              {filesCard}
              <Card className="order-2">
                <CardHeader>
                  <CardTitle className="text-base">Letzte Aktivitäten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Aus dem Aktivitätsprotokoll (evidence_events), bis zu fünf neueste Einträge.
                  </p>
                  <ReferenceActivitiesTimeline items={referenceActivities} />
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-6 space-y-4 h-fit">
          <Card className={role === 'sales' ? 'order-1' : 'order-1'}>
            <CardHeader>
              <CardTitle className="text-base">Projektdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium truncate max-w-[220px]">{headerCompany ?? ''}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Volumen</span>
                <span className="font-medium tabular-nums">
                  {formatReferenceVolume(ref.volume_eur)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Vertragsart</span>
                <span className="font-medium">{ref.contract_type ?? ''}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Projektstart</span>
                <span className="font-medium">{ref.project_start ?? ''}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Projektende</span>
                <span className="font-medium">{ref.project_end ?? ''}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Akt. Dienstleister</span>
                <span className="font-medium">{ref.incumbent_provider ?? ''}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Wettbewerber</span>
                <span className="font-medium">{ref.competitors ?? ''}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={role === 'sales' ? 'order-2' : undefined}>
            <CardHeader>
              <CardTitle className="text-base">Reference Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {role === 'sales' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">NDA</span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        Boolean(ref.is_nda_deal)
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : 'border-border bg-slate-50 text-slate-700'
                      }`}
                    >
                      {Boolean(ref.is_nda_deal) ? 'Vertraulich (NDA)' : 'Kein NDA'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Freigabe</span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        staleInternalPending || isApprovalGranted
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : internalApproval === 'pending_internal'
                            ? 'border-sky-200 bg-sky-50 text-sky-800'
                            : approvalStatus === 'pending'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-border bg-slate-50 text-slate-700'
                      }`}
                    >
                      {staleInternalPending || isApprovalGranted
                        ? 'Einsatzbereit'
                        : internalApproval === 'pending_internal'
                          ? 'Interne Prüfung'
                          : approvalStatus === 'pending'
                            ? 'Kundenfreigabe läuft'
                            : salesReadinessLabel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {staleInternalPending || isApprovalGranted
                      ? `Nutzen: ${salesReadinessLabel.toLowerCase()}.`
                      : internalApproval === 'pending_internal'
                        ? 'Die Referenz wird intern geprüft. Du musst nichts tun.'
                        : approvalStatus === 'pending'
                          ? 'Der Kunde bearbeitet die Freigabe.'
                          : 'Freigabe-Details siehst du nach Abschluss des Freigabeprozesses.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">NDA</span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        Boolean(ref.is_nda_deal)
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : 'border-border bg-slate-50 text-slate-700'
                      }`}
                    >
                      {Boolean(ref.is_nda_deal) ? 'Vertraulich (NDA)' : 'Kein NDA'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${readinessTone}`}>
                      {readinessLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Verantwortlich</span>
                    <span className="font-medium text-right">{ref.approval_owner_name ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Gültig bis</span>
                    <span className="font-medium">
                      {ref.approval_expires_at ? formatDateUtcDe(ref.approval_expires_at) : '—'}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground">Erlaubte Nutzung</p>
                    <div className="flex flex-wrap gap-1.5">
                      {scopeBadges.length ? (
                        scopeBadges.map((item) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                  {competitorBlacklist.length ? (
                    <div className="space-y-1.5">
                      <p className="text-muted-foreground">Nicht verwenden für</p>
                      <div className="flex flex-wrap gap-1.5">
                        {competitorBlacklist.map((item) => (
                          <Badge key={item} variant="outline">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {ref.approval_quote_approved || ref.approval_quote_proposed ? (
                    <div className="space-y-1.5">
                      <p className="text-muted-foreground">Zitat</p>
                      <p className="rounded-md border bg-muted/20 p-2 text-xs">
                        {ref.approval_quote_approved ?? ref.approval_quote_proposed}
                      </p>
                    </div>
                  ) : null}
                  {ref.approval_reference_giver_name ? (
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Referenz-Geber</p>
                      <p className="text-sm font-medium">
                        {ref.approval_reference_giver_name}
                        {ref.approval_reference_giver_title ? ` · ${ref.approval_reference_giver_title}` : ''}
                      </p>
                    </div>
                  ) : null}
                  {ref.approval_consent_file_url ? (
                    <a className="text-xs text-blue-600 underline" href={ref.approval_consent_file_url} target="_blank" rel="noreferrer">
                      Consent-Dokument ansehen
                    </a>
                  ) : null}
                  <ApprovalPendingActions
                    referenceId={id}
                    canInternalApprove={
                      internalStatus === 'pending_internal' &&
                      !staleInternalPending &&
                      (role === 'admin' || role === 'account_manager')
                    }
                    approvalStatus={approvalStatus}
                    internalStatus={internalStatus}
                    approvalOwnerName={ref.approval_owner_name ?? null}
                    approvalContactId={ref.approval_contact_id ?? null}
                    approvalExternalContactId={ref.approval_external_contact_id ?? null}
                    referenceContactId={ref.contact_id ?? null}
                    referenceCustomerContactId={ref.customer_contact_id ?? null}
                    staleInternalPending={staleInternalPending}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {role === 'sales' ? null : (
          <Card className="order-3">
            <CardHeader>
              <CardTitle className="text-base">Nutzung & Impact</CardTitle>
              <p className="text-xs text-muted-foreground">
                Aus dem Audit-Log (evidence_events). Gilt für alle Rollen mit Zugriff auf diese
                Referenz.
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md border bg-muted/25 p-2">
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <AppIcon icon={TrendingUp} size={12} />
                  Detail-Ansichten (App)
                </div>
                <div className="font-semibold tabular-nums text-slate-950 dark:text-slate-100">{n('reference_viewed')}</div>
              </div>
              <div className="rounded-md border bg-muted/25 p-2">
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <AppIcon icon={LinkIcon} size={12} />
                  Öffentliche Link-Aufrufe
                </div>
                <div className="font-semibold tabular-nums text-slate-950 dark:text-slate-100">{n('share_link_viewed')}</div>
              </div>
              <div className="rounded-md border bg-muted/25 p-2">
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <AppIcon icon={Sparkles} size={12} />
                  PDF-Exports
                </div>
                <div className="font-semibold tabular-nums text-slate-950 dark:text-slate-100">{n('reference_exported')}</div>
              </div>
              <div className="rounded-md border bg-muted/25 p-2">
                <div className="text-xs text-muted-foreground">Kundenlinks erstellt</div>
                <div className="font-semibold tabular-nums text-slate-950 dark:text-slate-100">{n('reference_shared')}</div>
              </div>
              <div className="rounded-md border bg-muted/25 p-2">
                <div className="text-xs text-muted-foreground">In Suchergebnissen</div>
                <div className="font-semibold tabular-nums text-slate-950 dark:text-slate-100">{n('reference_matched')}</div>
              </div>
              <div className="rounded-md border bg-muted/25 p-2">
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <AppIcon icon={TrendingUp} size={12} />
                  „Hat geholfen“ (Deal)
                </div>
                <div className="font-semibold tabular-nums text-slate-950 dark:text-slate-100">{n('reference_helped')}</div>
              </div>
              <div className="rounded-md border bg-muted/25 p-2">
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <AppIcon icon={LinkIcon} size={12} />
                  Deals verknüpft
                </div>
                <div className="font-semibold tabular-nums text-slate-950 dark:text-slate-100">{usageStats?.dealsLinked ?? 0}</div>
              </div>
              <div className="rounded-md border bg-muted/25 p-2">
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <AppIcon icon={Sparkles} size={12} />
                  Deal-Ergebnisse
                </div>
                <div className="font-semibold tabular-nums text-slate-950 dark:text-slate-100">
                  {usageStats
                    ? `${usageStats.dealsWon} / ${usageStats.dealsLost} / ${usageStats.dealsWithdrawn}`
                    : '—'}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  Gewonnen / Verloren / Abgebrochen
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          <Card className={role === 'sales' ? 'order-3' : 'order-4'}>
            <CardHeader>
              <CardTitle className="text-base">Aktionen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <PptxOnepagerExportButton referenceId={id} className="w-full gap-2" />
                <PdfExportDialog referenceId={id} triggerClassName="w-full" />
              </div>
              {role === 'sales' ? null : (
                <>
                  {!isApprovalGranted ? (
                    <RequestApprovalDialog
                      referenceId={id}
                      defaultContactId={ref.customer_contact_id ?? ref.contact_id}
                      triggerIcon={<AppIcon icon={Mail} size={16} />}
                    />
                  ) : null}
                  <ShareLinkButton referenceId={id} triggerClassName="w-full" />
                  <form action={toggleFavorite.bind(null, id)}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <AppIcon
                        icon={StarIcon}
                        size={16}
                        className={
                          isFavorited
                            ? 'text-amber-500 dark:text-amber-400'
                            : 'text-muted-foreground opacity-80'
                        }
                      />
                      {isFavorited ? 'Favorit' : 'Favorisieren'}
                    </Button>
                  </form>
                  <Button asChild variant="outline" className="w-full gap-2">
                    <Link href={ROUTES.evidence.edit(id)}>
                      <AppIcon icon={Pencil} size={16} />
                      Bearbeiten
                    </Link>
                  </Button>
                  {role === 'admin' ? (
                    <form action={deleteReferenceFromDetailPage.bind(null, id)} className="w-full">
                      <Button type="submit" variant="destructive" className="w-full">
                        Löschen
                      </Button>
                    </form>
                  ) : null}
                </>
              )}
              {role === 'sales' ? (
                <>
                  <ShareLinkButton referenceId={id} triggerClassName="w-full" />
                  <form action={toggleFavorite.bind(null, id)}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <AppIcon
                        icon={StarIcon}
                        size={16}
                        className={
                          isFavorited
                            ? 'text-amber-500 dark:text-amber-400'
                            : 'text-muted-foreground opacity-80'
                        }
                      />
                      {isFavorited ? 'Favorit' : 'Favorisieren'}
                    </Button>
                  </form>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


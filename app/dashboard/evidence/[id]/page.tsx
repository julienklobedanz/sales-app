import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getExistingShareForReference, toggleFavorite } from '@/app/dashboard/actions'
import {
  Building2,
  Calendar,
  Globe,
  LinkIcon,
  MapPinIcon,
  Pencil,
  StarIcon,
  TrendingUp,
  UploadIcon,
  Users,
} from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { formatEmployeeCountDeDisplay, formatReferenceDate, formatReferenceVolume, normalizeOrgDateDisplayFormat } from '@/lib/format'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'
import { deleteReferenceFromDetailPage } from './actions'
import { ReferenceStatusWithHint } from '@/components/reference-status-with-hint'
import { ROUTES } from '@/lib/routes'
import { DASHBOARD_PAGE_TITLE_CLASS } from '@/lib/dashboard-ui'
import { PdfExportDialog } from './pdf-export-dialog'
import { PptxOnepagerExportButton } from './pptx-onepager-export-button'
import { ShareLinkButton } from './share-link-button'
import { ReferenceReadinessActions } from './reference-readiness-actions'
import { ReferenceReadinessValue } from './reference-readiness-value'
import {
  formatApprovalDelegatedRecipientLine,
  formatApprovalGiverLine,
  resolveApprovalCoordinatorDisplay,
} from '@/lib/references/approval-workflow-display'
import { resolveCustomerApprovalFollowUpUi } from '@/lib/references/approval-change-requests'
import {
  canEditInternalApprovalCoordinator,
  canEditPreCustomerApprovalRecipient,
} from '@/lib/references/pre-customer-approval-edit'
import {
  canStartApprovalWorkflow,
} from '@/lib/references/approval-workflow'
import { isStaleInternalPending } from '@/lib/references/stale-internal-pending'
import {
  canApproveInternalReference,
  canManageReferencesAsAdmin,
  isReferenceStatusAccessibleToUser,
  isSalesAppView,
  resolveReferenceVisibilityScope,
} from '@/lib/roles/reference-access'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { parseRolesPermissionsSettings } from '@/lib/roles/roles-permissions-settings'
import {
  resolveReferenceReadinessState,
  resolveFreigabestatusCardBadges,
} from '@/lib/references/reference-readiness-state'
import { ReferenceViewedTracker } from './reference-viewed-tracker'
import { getReferenceDetailActivities } from './reference-detail-activities'
import { ReferenceActivitiesTimeline } from './reference-activities-timeline'
import { ReferenceContextHighlighted } from '@/components/reference-context-highlighted'
import {
  buildReferenceHighlightPhrases,
  extractWorkflowHighlightGlossary,
} from '@/lib/references/reference-context-highlights'
import { normalizeNarrativeText } from '@/lib/references/narrative-normalize'
import { getReferenceAssetsImpl } from '@/lib/evidence/assets'
import { formatProjectEndWithDurationDe } from '@/lib/references/reference-duration-months'
import { cn } from '@/lib/utils'

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
    .select('organization_id, full_name, system_role, function_role, capabilities')
    .eq('id', user.id)
    .single()
  if (!profile) redirect(ROUTES.onboarding)

  const parsedRoles = parseProfileRoles(profile)
  const { systemRole, functionRole, capabilities } = parsedRoles
  const isSalesView = isSalesAppView(systemRole, functionRole)
  const organizationId = (profile as { organization_id?: string | null }).organization_id ?? null
  const requesterDisplayName =
    typeof (profile as { full_name?: string | null }).full_name === 'string'
      ? (profile as { full_name: string }).full_name.trim()
      : ''

  let orgDateFmt = normalizeOrgDateDisplayFormat('de-DE')
  let orgRolesPermissions = null
  if (organizationId) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('date_display_format, api_settings')
      .eq('id', organizationId)
      .maybeSingle()
    orgDateFmt = normalizeOrgDateDisplayFormat(
      (orgRow as { date_display_format?: string | null } | null)?.date_display_format
    )
    if (orgRow?.api_settings && typeof orgRow.api_settings === 'object') {
      orgRolesPermissions = parseRolesPermissionsSettings(
        (orgRow.api_settings as Record<string, unknown>).roles_permissions
      )
    }
  }

  const { data: row, error } = await supabase
    .from('references')
    .select(
      `
      id,
      title,
      industry,
      country,
      status,
      contact_id,
      customer_contact_id,
      customer_approval_status,
      approval_owner_name,
      approval_requester_name,
      approval_coordinator_email,
      approval_coordinator_name,
      approval_customer_facing_name,
      approval_requested_at,
      approval_expires_at,
      approval_scope_named_mention,
      approval_scope_anonymous_mention,
      approval_scope_reference_call,
      approval_scope_logo_use,
      approval_scope_confidential_sales,
      approval_reference_call_frequency,
      approval_grace_until,
      approval_internal_status,
      approval_contact_id,
      approval_external_contact_id,
      approval_reference_giver_name,
      approval_reference_giver_title,
      approval_delegated_to_name,
      approval_delegated_to_email,
      approval_competitor_blacklist,
      approval_quote_proposed,
      approval_quote_approved,
      approval_comment,
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
    industry: string | null
    country: string | null
    status: string
    contact_id: string | null
    customer_contact_id: string | null
    customer_approval_status: string | null
    approval_owner_name: string | null
    approval_requester_name: string | null
    approval_coordinator_email: string | null
    approval_coordinator_name: string | null
    approval_customer_facing_name: string | null
    approval_requested_at: string | null
    approval_expires_at: string | null
    approval_scope_named_mention: boolean | null
    approval_scope_anonymous_mention: boolean | null
    approval_scope_reference_call: boolean | null
    approval_scope_logo_use: boolean | null
    approval_scope_confidential_sales: boolean | null
    approval_reference_call_frequency: string | null
    approval_grace_until: string | null
    approval_internal_status: string | null
    approval_contact_id: string | null
    approval_external_contact_id: string | null
    approval_reference_giver_name: string | null
    approval_reference_giver_title: string | null
    approval_delegated_to_name: string | null
    approval_delegated_to_email: string | null
    approval_competitor_blacklist: string[] | null
    approval_quote_proposed: string | null
    approval_quote_approved: string | null
    approval_comment: string | null
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
  const visibilityScope = resolveReferenceVisibilityScope({
    systemRole,
    functionRole,
    capabilityOverrides: capabilities,
    orgRolesPermissions,
  })
  if (!isReferenceStatusAccessibleToUser(normalizedStatus, visibilityScope)) {
    notFound()
  }

  const { data: favorite } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('reference_id', id)
    .maybeSingle()

  const isFavorited = Boolean(favorite?.id)
  const tags = splitTags(ref.tags ?? null)
  const company = Array.isArray(ref.companies) ? ref.companies[0] : ref.companies

  let defaultAccountManagerEmail: string | null = null
  if (company?.id) {
    const { data: companyApprovalRow } = await supabase
      .from('companies')
      .select('internal_reference_approval_contact_id')
      .eq('id', company.id)
      .maybeSingle()
    const internalApprovalContactId = (
      companyApprovalRow as { internal_reference_approval_contact_id?: string | null } | null
    )?.internal_reference_approval_contact_id
    if (internalApprovalContactId) {
      const { data: approvalContactPerson } = await supabase
        .from('contact_persons')
        .select('email')
        .eq('id', internalApprovalContactId)
        .eq('company_id', company.id)
        .maybeSingle()
      const email = String(
        (approvalContactPerson as { email?: string | null } | null)?.email ?? ''
      ).trim()
      if (email.includes('@')) defaultAccountManagerEmail = email
    }
  }

  const isAnonymizedView = qs?.view === 'anonymized'
  const companyName = company?.name ?? null
  const headerCompany = isAnonymizedView ? 'Kunde' : companyName
  const industryLabel = anonymizeText(formatIndustryDisplay(ref.industry) || null, companyName)
  const refEmployeeRaw = ref.employee_count ?? company?.employee_count ?? null
  const employeeMetaLabel =
    typeof refEmployeeRaw === 'number' && Number.isFinite(refEmployeeRaw)
      ? formatEmployeeCountDeDisplay(refEmployeeRaw)
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
  const challengeTextRaw = isAnonymizedView
    ? anonymizeText(ref.customer_challenge ?? null, companyName)
    : (ref.customer_challenge ?? null)
  const solutionTextRaw = isAnonymizedView
    ? anonymizeText(ref.our_solution ?? null, companyName)
    : (ref.our_solution ?? null)
  const challengeText = normalizeNarrativeText(challengeTextRaw)
  const solutionText = normalizeNarrativeText(solutionTextRaw)
  const hasChallenge = Boolean(challengeText?.trim())
  const hasSolution = Boolean(solutionText?.trim())
  /** Herausforderung und Lösung untereinander (ruhiger Lesefluss). */
  const challengeSolutionGridClass = 'grid gap-4 grid-cols-1'
  const internalApproval = String(ref.approval_internal_status ?? '').toLowerCase()
  const isWithdrawnInternal = internalApproval === 'withdrawn_internal'
  const customerAccessRevoked =
    String(ref.customer_approval_status ?? '').toLowerCase() === 'revoked_by_customer'
  const isApprovalGranted =
    !isWithdrawnInternal &&
    !customerAccessRevoked &&
    (String(ref.customer_approval_status ?? '').toLowerCase() === 'approved' ||
      normalizedStatus === 'approved' ||
      normalizedStatus === 'external')
  const nowMs = new Date().getTime()
  const expiresMs = ref.approval_expires_at ? new Date(ref.approval_expires_at).getTime() : null
  const graceMs = ref.approval_grace_until ? new Date(ref.approval_grace_until).getTime() : null
  const baseApprovalStatus = String(ref.customer_approval_status ?? '').toLowerCase()
  const approvalStatus =
    baseApprovalStatus === 'approved' && expiresMs && expiresMs < nowMs && graceMs && graceMs >= nowMs
      ? 'expired'
      : baseApprovalStatus
  const staleInternalPending = isStaleInternalPending({
    internalApprovalStatus: internalApproval,
    customerApprovalStatus: ref.customer_approval_status,
    referenceStatus: normalizedStatus,
    approvalRequestedAt: ref.approval_requested_at,
    customerAccessRevoked,
  })

  /** Referenz-Stufe (Sales-Sicht, Portfolio): unabhängig vom Kunden-Freigabe-Workflow. */
  const referenceIsInternalOnly =
    normalizedStatus === 'internal_only' || normalizedStatus === 'internal'

  const competitorBlacklist = Array.isArray(ref.approval_competitor_blacklist)
    ? ref.approval_competitor_blacklist
    : []
  const internalStatus = String(ref.approval_internal_status ?? '')
  const isNdaDeal = Boolean(ref.is_nda_deal)
  const ndaDealBadgeClass = isNdaDeal
    ? 'border-amber-200 bg-amber-50 text-amber-900'
    : 'border-border bg-slate-50 text-slate-700'

  const canStartApproval = canStartApprovalWorkflow({
    systemRole,
    functionRole,
    referenceStatus: normalizedStatus,
    internalApprovalStatus: internalApproval,
    customerApprovalStatus: ref.customer_approval_status,
    approvalRequestedAt: ref.approval_requested_at,
    staleInternalPending,
    isApprovalGranted,
  })
  const autoOpenApprovalDialog = qs.startApproval === '1' || qs.startApproval === 'true'

  const workflowStatusBadges = resolveFreigabestatusCardBadges({
    internalApprovalStatus: internalApproval,
    customerApprovalStatus: ref.customer_approval_status,
    referenceStatus: normalizedStatus,
    approvalRequestedAt: ref.approval_requested_at,
    approvalScopeNamedMention: ref.approval_scope_named_mention,
    approvalScopeAnonymousMention: ref.approval_scope_anonymous_mention,
    approvalScopeReferenceCall: ref.approval_scope_reference_call,
    approvalScopeConfidentialSales: ref.approval_scope_confidential_sales,
    approvalScopeLogoUse: ref.approval_scope_logo_use,
    referenceIsInternalOnly,
  })

  const readinessState = resolveReferenceReadinessState({
    referenceStatus: normalizedStatus,
    internalApprovalStatus: internalApproval,
    customerApprovalStatus: ref.customer_approval_status,
    approvalRequestedAt: ref.approval_requested_at,
    staleInternalPending,
    isApprovalGranted,
    canStartApproval,
    canInternalApprove: canApproveInternalReference(functionRole, systemRole, capabilities),
    approvalScopeNamedMention: ref.approval_scope_named_mention,
    approvalScopeAnonymousMention: ref.approval_scope_anonymous_mention,
    approvalScopeReferenceCall: ref.approval_scope_reference_call,
    approvalScopeConfidentialSales: ref.approval_scope_confidential_sales,
    approvalScopeLogoUse: ref.approval_scope_logo_use,
    referenceIsInternalOnly,
  })

  const existingShare = await getExistingShareForReference(id)

  const requestedByDisplay = (ref.approval_requester_name ?? ref.approval_owner_name ?? '').trim() || null
  const coordinatorDisplay = resolveApprovalCoordinatorDisplay({
    customerFacingName: ref.approval_customer_facing_name,
    coordinatorName: ref.approval_coordinator_name,
    coordinatorEmail: ref.approval_coordinator_email,
  })
  const approvingCustomerDisplay = formatApprovalGiverLine(
    ref.approval_reference_giver_name,
    ref.approval_reference_giver_title
  )
  const delegatedRecipientDisplay = formatApprovalDelegatedRecipientLine(
    ref.approval_delegated_to_name,
    ref.approval_delegated_to_email
  )
  const customerApprovalFollowUp = await resolveCustomerApprovalFollowUpUi(
    supabase,
    id,
    ref.customer_approval_status,
    ref.approval_comment,
    { showMagicLink: readinessState.showMagicLink }
  )
  const canEditPendingCustomerEmail = canEditPreCustomerApprovalRecipient({
    customerApprovalStatus: ref.customer_approval_status,
    approvalRequestedAt: ref.approval_requested_at,
    internalApprovalStatus: internalApproval,
  })
  const canEditCoordinatorEmail = canEditInternalApprovalCoordinator({
    approvalRequestedAt: ref.approval_requested_at,
    internalApprovalStatus: internalApproval,
  })

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
    getReferenceDetailActivities(id),
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
                <ReferenceStatusWithHint
                  status={ref.status}
                  customerApprovalStatus={ref.customer_approval_status}
                  approvalInternalStatus={ref.approval_internal_status}
                  approvalRequestedAt={ref.approval_requested_at}
                  approvalScopeNamedMention={ref.approval_scope_named_mention}
                  approvalScopeAnonymousMention={ref.approval_scope_anonymous_mention}
                />
              </div>
              <h1 className={`${DASHBOARD_PAGE_TITLE_CLASS} break-words`}>
                {ref.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {headerCompany ? (
                  isAnonymizedView || !company?.id ? (
                    <span className="inline-flex max-w-[min(100%,240px)] shrink-0 items-center font-medium text-foreground/90">
                      {headerCompany}
                    </span>
                  ) : (
                    <span className="inline-flex max-w-[min(100%,240px)] shrink-0 items-center font-medium text-foreground/90">
                      <Link
                        href={ROUTES.accountsDetail(company.id)}
                        className="truncate transition-colors hover:text-foreground hover:underline"
                      >
                        {headerCompany}
                      </Link>
                    </span>
                  )
                ) : null}
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
              {tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {hasChallenge || hasSolution ? (
            <div className="w-full min-w-0 space-y-6">
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
              </div>
              {isSalesView ? filesCard : null}
            </div>
          ) : isSalesView && filesCard ? (
            <div className="w-full min-w-0">{filesCard}</div>
          ) : null}

          {isSalesView ? (
            <Card className="border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-950 dark:text-slate-100 inline-flex items-center gap-1.5">
                  <AppIcon icon={Calendar} size={14} className="text-muted-foreground" />
                  Letzte Ereignisse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReferenceActivitiesTimeline items={referenceActivities} />
              </CardContent>
            </Card>
          ) : (
            <>
              {filesCard}
              <Card className="border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-950 dark:text-slate-100 inline-flex items-center gap-1.5">
                    <AppIcon icon={Calendar} size={14} className="text-muted-foreground" />
                    Letzte Ereignisse
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ReferenceActivitiesTimeline items={referenceActivities} />
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-6 space-y-4 h-fit">
          <Card className={isSalesView ? 'order-1' : 'order-1'}>
            <CardHeader>
              <CardTitle className="text-base">Projektdetails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Volumen</span>
                <span className="font-medium tabular-nums">
                  {formatReferenceVolume(ref.volume_eur)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Vertragsart</span>
                <span className="font-medium">{formatContractTypeDisplay(ref.contract_type)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Projektstart</span>
                <span className="font-medium">{ref.project_start ? formatReferenceDate(ref.project_start, orgDateFmt) : ''}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Projektende</span>
                <span className="font-medium text-right">
                  {ref.project_end
                    ? formatProjectEndWithDurationDe({
                        project_start: ref.project_start,
                        project_end: ref.project_end,
                        project_status: ref.project_status,
                        formatEndDate: (iso) => formatReferenceDate(iso, orgDateFmt),
                      })
                    : ''}
                </span>
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

          <Card className={cn('w-full min-w-0', isSalesView ? 'order-2' : undefined)}>
            <CardHeader>
              <CardTitle className="text-base">Freigabestatus</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 space-y-3 text-sm transition-all duration-200">
              <div className="min-w-0 space-y-2">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="shrink-0 pt-0.5 text-muted-foreground">Unter NDA?</span>
                  <span
                    className={`min-w-0 max-w-[58%] shrink whitespace-normal rounded-full border px-2.5 py-0.5 text-right text-xs font-medium leading-tight transition-colors duration-200 ${ndaDealBadgeClass}`}
                  >
                    {isNdaDeal ? 'Ja' : 'Nein'}
                  </span>
                </div>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="shrink-0 pt-0.5 text-muted-foreground">Intern</span>
                  <span
                    className={cn(
                      'min-w-0 max-w-[58%] shrink whitespace-normal rounded-full border px-2.5 py-0.5 text-right text-xs font-medium leading-tight transition-colors duration-200',
                      workflowStatusBadges.internal.className
                    )}
                  >
                    {workflowStatusBadges.internal.label}
                  </span>
                </div>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="shrink-0 pt-0.5 text-muted-foreground">Kunde</span>
                  <span
                    className={cn(
                      'min-w-0 max-w-[58%] shrink whitespace-normal rounded-full border px-2.5 py-0.5 text-right text-xs font-medium leading-tight transition-colors duration-200',
                      workflowStatusBadges.customer.className
                    )}
                  >
                    {workflowStatusBadges.customer.label}
                  </span>
                </div>
                {!isSalesView ? (
                  <>
                    {requestedByDisplay ? (
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <span className="shrink-0 pt-0.5 text-muted-foreground">Angefragt von</span>
                        <ReferenceReadinessValue value={requestedByDisplay} />
                      </div>
                    ) : null}
                    {coordinatorDisplay ? (
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <span className="shrink-0 pt-0.5 text-muted-foreground">Accountverantw.</span>
                        <ReferenceReadinessValue value={coordinatorDisplay} />
                      </div>
                    ) : null}
                    {approvingCustomerDisplay ? (
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <span className="shrink-0 pt-0.5 text-muted-foreground">Kunde</span>
                        <ReferenceReadinessValue value={approvingCustomerDisplay} />
                      </div>
                    ) : null}
                    {delegatedRecipientDisplay ? (
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <span className="shrink-0 pt-0.5 text-muted-foreground">Aktueller Empfänger</span>
                        <ReferenceReadinessValue value={delegatedRecipientDisplay} />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
              {isSalesView ? null : (
                <>
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
                  {!customerAccessRevoked &&
                  (ref.approval_quote_approved || ref.approval_quote_proposed) ? (
                    <div className="space-y-1.5">
                      <p className="text-muted-foreground">Zitat</p>
                      <p className="rounded-md border bg-muted/20 p-2 text-xs">
                        {ref.approval_quote_approved ?? ref.approval_quote_proposed}
                      </p>
                    </div>
                  ) : null}
                  {ref.approval_consent_file_url ? (
                    <a className="text-xs text-blue-600 underline" href={ref.approval_consent_file_url} target="_blank" rel="noreferrer">
                      Consent-Dokument ansehen
                    </a>
                  ) : null}
                </>
              )}
              <ReferenceReadinessActions
                referenceId={id}
                readiness={readinessState}
                existingSharePath={existingShare?.url ?? null}
                canStartApproval={canStartApproval}
                canInternalApprove={
                  canApproveInternalReference(functionRole, systemRole, capabilities) &&
                  internalStatus === 'approved_internal' &&
                  !staleInternalPending
                }
                defaultAccountManagerEmail={defaultAccountManagerEmail}
                autoOpenApprovalDialog={autoOpenApprovalDialog}
                approvalContactId={ref.approval_contact_id ?? null}
                approvalExternalContactId={ref.approval_external_contact_id ?? null}
                referenceContactId={ref.contact_id ?? null}
                referenceCustomerContactId={ref.customer_contact_id ?? null}
                hasCustomerChangeRequests={customerApprovalFollowUp.hasOpenChangeRequests}
                canEditCustomerEmail={
                  customerApprovalFollowUp.canEditCustomerEmail || canEditPendingCustomerEmail
                }
                canEditCoordinatorEmail={canEditCoordinatorEmail}
                customerChangeRequestComment={ref.approval_comment}
              />
            </CardContent>
          </Card>

          <Card className="order-3">
            <CardHeader>
              <CardTitle className="text-base">Aktionen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <PptxOnepagerExportButton referenceId={id} className="w-full gap-2" />
                <PdfExportDialog referenceId={id} triggerClassName="w-full" />
              </div>
              {isSalesView ? null : (
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
                  <Button asChild variant="outline" className="w-full gap-2">
                    <Link href={ROUTES.evidence.edit(id)}>
                      <AppIcon icon={Pencil} size={16} />
                      Bearbeiten
                    </Link>
                  </Button>
                  {canManageReferencesAsAdmin(systemRole) ? (
                    <form action={deleteReferenceFromDetailPage.bind(null, id)} className="w-full">
                      <Button type="submit" variant="destructive" className="w-full">
                        Löschen
                      </Button>
                    </form>
                  ) : null}
                </>
              )}
              {isSalesView ? (
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


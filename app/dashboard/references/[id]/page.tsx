import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getExistingShareForReference } from '@/app/dashboard/actions'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { formatEmployeeCountDeDisplay, normalizeOrgDateDisplayFormat } from '@/lib/format'
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
import { canStartApprovalWorkflow } from '@/lib/references/approval-workflow'
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
import {
  buildReferenceHighlightPhrases,
  extractWorkflowHighlightGlossary,
} from '@/lib/references/reference-context-highlights'
import { normalizeNarrativeText } from '@/lib/references/narrative-normalize'
import { getReferenceAssetsImpl } from '@/lib/references/library/assets'
import { ROUTES } from '@/lib/routes'
import { ReferenceViewedTracker } from './reference-viewed-tracker'
import {
  anonymizeText,
  buildDetailFileRows,
  splitTags,
} from './reference-detail-helpers'
import { ReferenceDetailHeader } from './reference-detail-header'
import { ReferenceDetailMain } from './reference-detail-main'
import { ReferenceDetailSidebar } from './reference-detail-sidebar'

export const dynamic = 'force-dynamic'

export default async function ReferenceDetailPage({
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
  const organizationId = profile.organization_id ?? null

  let orgDateFmt = normalizeOrgDateDisplayFormat('de-DE')
  let orgRolesPermissions = null
  if (organizationId) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('date_display_format, api_settings')
      .eq('id', organizationId)
      .maybeSingle()
    orgDateFmt = normalizeOrgDateDisplayFormat(orgRow?.date_display_format)
    if (orgRow?.api_settings && typeof orgRow.api_settings === 'object') {
      orgRolesPermissions = parseRolesPermissionsSettings(
        (orgRow.api_settings as Record<string, unknown>).roles_permissions,
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
    `,
    )
    .eq('id', id)
    .single()

  if (error || !row) notFound()

  const ref = row

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
    const internalApprovalContactId =
      companyApprovalRow?.internal_reference_approval_contact_id
    if (internalApprovalContactId) {
      const { data: approvalContactPerson } = await supabase
        .from('contact_persons')
        .select('email')
        .eq('id', internalApprovalContactId)
        .eq('company_id', company.id)
        .maybeSingle()
      const email = String(approvalContactPerson?.email ?? '').trim()
      if (email.includes('@')) defaultAccountManagerEmail = email
    }
  }

  const isAnonymizedView = qs?.view === 'anonymized'
  const companyName = company?.name ?? null
  const headerCompany = isAnonymizedView ? 'Kunde' : companyName
  const industryLabel = anonymizeText(
    formatIndustryDisplay(ref.industry) || null,
    companyName,
  )
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
    canInternalApprove: canApproveInternalReference(
      functionRole,
      systemRole,
      capabilities,
    ),
    approvalScopeNamedMention: ref.approval_scope_named_mention,
    approvalScopeAnonymousMention: ref.approval_scope_anonymous_mention,
    approvalScopeReferenceCall: ref.approval_scope_reference_call,
    approvalScopeConfidentialSales: ref.approval_scope_confidential_sales,
    approvalScopeLogoUse: ref.approval_scope_logo_use,
    referenceIsInternalOnly,
  })

  const existingShare = await getExistingShareForReference(id)

  const requestedByDisplay =
    (ref.approval_requester_name ?? ref.approval_owner_name ?? '').trim() || null
  const coordinatorDisplay = resolveApprovalCoordinatorDisplay({
    customerFacingName: ref.approval_customer_facing_name,
    coordinatorName: ref.approval_coordinator_name,
    coordinatorEmail: ref.approval_coordinator_email,
  })
  const approvingCustomerDisplay = formatApprovalGiverLine(
    ref.approval_reference_giver_name,
    ref.approval_reference_giver_title,
  )
  const delegatedRecipientDisplay = formatApprovalDelegatedRecipientLine(
    ref.approval_delegated_to_name,
    ref.approval_delegated_to_email,
  )
  const customerApprovalFollowUp = await resolveCustomerApprovalFollowUpUi(
    supabase,
    id,
    ref.customer_approval_status,
    ref.approval_comment,
    { showMagicLink: readinessState.showMagicLink },
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

  const assetRows = await getReferenceAssetsImpl(id)

  const publicBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
  const detailFileRows = buildDetailFileRows(assetRows, ref.file_path, publicBase)

  return (
    <div>
      <ReferenceViewedTracker referenceId={id} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <ReferenceDetailHeader
            title={ref.title}
            status={ref.status}
            customerApprovalStatus={ref.customer_approval_status}
            approvalInternalStatus={ref.approval_internal_status}
            approvalRequestedAt={ref.approval_requested_at}
            approvalScopeNamedMention={ref.approval_scope_named_mention}
            approvalScopeAnonymousMention={ref.approval_scope_anonymous_mention}
            headerCompany={headerCompany}
            companyId={company?.id}
            isAnonymizedView={isAnonymizedView}
            industryLabel={industryLabel}
            employeeMetaLabel={employeeMetaLabel}
            locationMetaLabel={locationMetaLabel}
            websiteMetaHref={websiteMetaHref}
            tags={tags}
          />
          <ReferenceDetailMain
            isSalesView={isSalesView}
            hasChallenge={hasChallenge}
            hasSolution={hasSolution}
            challengeText={challengeText}
            solutionText={solutionText}
            highlightPhrases={highlightPhrases}
            detailFileRows={detailFileRows}
          />
        </div>

        <ReferenceDetailSidebar
          referenceId={id}
          isSalesView={isSalesView}
          volumeEur={ref.volume_eur}
          contractType={ref.contract_type}
          projectStart={ref.project_start}
          projectEnd={ref.project_end}
          projectStatus={ref.project_status}
          orgDateFmt={orgDateFmt}
          incumbentProvider={ref.incumbent_provider}
          competitors={ref.competitors}
          isNdaDeal={isNdaDeal}
          ndaDealBadgeClass={ndaDealBadgeClass}
          workflowStatusBadges={workflowStatusBadges}
          requestedByDisplay={requestedByDisplay}
          coordinatorDisplay={coordinatorDisplay}
          approvingCustomerDisplay={approvingCustomerDisplay}
          delegatedRecipientDisplay={delegatedRecipientDisplay}
          competitorBlacklist={competitorBlacklist}
          customerAccessRevoked={customerAccessRevoked}
          approvalQuoteApproved={ref.approval_quote_approved}
          approvalQuoteProposed={ref.approval_quote_proposed}
          approvalConsentFileUrl={ref.approval_consent_file_url}
          readinessState={readinessState}
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
          isFavorited={isFavorited}
          canManageAsAdmin={canManageReferencesAsAdmin(systemRole)}
        />
      </div>
    </div>
  )
}

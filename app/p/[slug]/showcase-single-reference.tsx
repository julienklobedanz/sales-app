import { Building2, Globe } from '@hugeicons/core-free-icons'

import { ApprovalCaseDataBar } from '@/app/approval/[token]/approval-case-data-bar'
import { AppIcon } from '@/lib/icons'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { formatDateUtcDe, formatReferenceVolume } from '@/lib/format'
import { formatProjectEndWithDurationDe } from '@/lib/references/reference-duration-months'
import { buildPublicProspectPreviewUrl } from '@/lib/public-portfolio/build-prospect-preview-url'
import { showcaseFieldDisplay } from '@/lib/public-portfolio/showcase-field-display'
import type { ManageInsightSummary } from '@/app/p/[slug]/showcase-manage-insight-bar'
import type { PublicReference } from '../actions'
import { ShowcaseReferenceContent } from './showcase-reference-content'
import { ShowcaseProjectDetails } from './showcase-project-details'
import { ShowcaseSecurityLink } from './showcase-security-link'
import { ShowcaseFloatingActions } from './showcase-floating-actions'

type Branding = {
  name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
}

function pushCaseItem(
  items: Array<{ label: string; value: React.ReactNode; icon?: React.ReactNode }>,
  label: string,
  raw: string | null | undefined,
  revokeMode: boolean,
  icon?: React.ReactNode
) {
  const { show, value } = showcaseFieldDisplay(raw, revokeMode)
  if (!show) return
  items.push({ label, value, icon })
}

export function ShowcaseSingleReference({
  slug,
  reference,
  branding,
  workspaceName,
  shareOwnerName,
  shareOwnerPosition,
  shareOwnerAvatar,
  shareOwnerEmail,
  shareOwnerPhone,
  shareOwnerBookingUrl,
  canDeactivate,
  revokeMode,
  approvalEditUrl,
  showApprovalEdit,
  buyerLogoUrl,
  buyerCompanyName,
  recipientToken,
  manageInsights,
}: {
  slug: string
  reference: PublicReference
  branding: Branding
  workspaceName: string
  shareOwnerName: string
  shareOwnerPosition: string
  shareOwnerAvatar: string | null
  shareOwnerEmail: string | null
  shareOwnerPhone: string | null
  shareOwnerBookingUrl: string | null
  canDeactivate: boolean
  revokeMode: boolean
  approvalEditUrl?: string | null
  showApprovalEdit?: boolean
  buyerLogoUrl?: string | null
  buyerCompanyName?: string | null
  recipientToken?: string | null
  manageInsights?: ManageInsightSummary | null
}) {
  const volRaw = formatReferenceVolume(reference.volume_eur)
  const startRaw =
    reference.project_start && String(reference.project_start).trim() !== ''
      ? formatDateUtcDe(String(reference.project_start))
      : null
  const endRaw =
    reference.project_end && String(reference.project_end).trim() !== ''
      ? formatProjectEndWithDurationDe({
          project_start: reference.project_start,
          project_end: reference.project_end,
          project_status: reference.project_status,
          formatEndDate: (iso) => formatDateUtcDe(iso),
        })
      : null

  const caseDataItems: Array<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> =
    []
  pushCaseItem(
    caseDataItems,
    'Branche',
    formatIndustryDisplay(reference.industry) || null,
    revokeMode,
    <AppIcon icon={Building2} size={14} />
  )
  pushCaseItem(
    caseDataItems,
    'Land',
    reference.country,
    revokeMode,
    <AppIcon icon={Globe} size={14} />
  )
  pushCaseItem(caseDataItems, 'Volumen', volRaw, revokeMode)
  pushCaseItem(caseDataItems, 'Projektstart', startRaw, revokeMode)
  pushCaseItem(caseDataItems, 'Projektende', endRaw, revokeMode)

  const prospectPreviewHref = revokeMode
    ? buildPublicProspectPreviewUrl(slug, recipientToken)
    : null

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-10 space-y-4 text-center">
          {buyerLogoUrl ? (
            <div className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buyerLogoUrl}
                alt={buyerCompanyName ?? 'Kunde'}
                className="h-10 max-w-[140px] object-contain"
              />
              {buyerCompanyName ? (
                <span className="text-xs text-muted-foreground">für {buyerCompanyName}</span>
              ) : null}
            </div>
          ) : null}
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- öffentliche Branding-URL
            <img
              src={branding.logo_url}
              alt={workspaceName}
              className="mx-auto h-12 w-auto max-w-[200px] object-contain"
            />
          ) : null}
          <p className="text-sm font-medium" style={{ color: branding.secondary_color }}>
            {workspaceName}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: branding.primary_color }}>
            {reference.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {reference.company_name}
            {reference.industry ? ` · ${formatIndustryDisplay(reference.industry)}` : ''}
          </p>
        </header>

        <ApprovalCaseDataBar
          items={caseDataItems}
          referenceTitle={reference.title}
          revokeMode={revokeMode}
          prospectPreviewHref={prospectPreviewHref}
          manageInsights={revokeMode && canDeactivate ? manageInsights : null}
        />

        <div className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="min-w-0 space-y-6">
            <ShowcaseReferenceContent
              summary={reference.summary}
              challenge={reference.customer_challenge}
              solution={reference.our_solution}
            />

            <div className="pt-2">
              <ShowcaseSecurityLink workspaceName={workspaceName} />
            </div>
          </div>

          <ShowcaseProjectDetails
            reference={reference}
            slug={slug}
            shareOwnerEmail={shareOwnerEmail}
            bookingUrl={shareOwnerBookingUrl}
            approvalEditUrl={approvalEditUrl}
            showApprovalEdit={showApprovalEdit}
            manageMode={revokeMode}
          />
        </div>
      </div>

      <ShowcaseFloatingActions
        slug={slug}
        showRevoke={canDeactivate && revokeMode}
        shareOwnerName={shareOwnerName}
        shareOwnerPosition={shareOwnerPosition}
        shareOwnerAvatar={shareOwnerAvatar}
        shareOwnerEmail={shareOwnerEmail}
        shareOwnerPhone={shareOwnerPhone}
      />
    </div>
  )
}

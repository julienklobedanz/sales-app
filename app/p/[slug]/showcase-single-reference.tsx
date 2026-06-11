import { Building2, Globe } from '@hugeicons/core-free-icons'

import { ApprovalCaseDataBar } from '@/app/approval/[token]/approval-case-data-bar'
import { AppIcon } from '@/lib/icons'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { formatDateUtcDe, formatReferenceVolume } from '@/lib/format'
import { formatProjectEndWithDurationDe } from '@/lib/references/reference-duration-months'
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
}) {
  const vol = formatReferenceVolume(reference.volume_eur) || '—'
  const start =
    reference.project_start && String(reference.project_start).trim() !== ''
      ? formatDateUtcDe(String(reference.project_start))
      : '—'
  const end =
    reference.project_end && String(reference.project_end).trim() !== ''
      ? formatProjectEndWithDurationDe({
          project_start: reference.project_start,
          project_end: reference.project_end,
          project_status: reference.project_status,
          formatEndDate: (iso) => formatDateUtcDe(iso),
        })
      : '—'

  const caseDataItems = [
    {
      label: 'Branche',
      value: formatIndustryDisplay(reference.industry) || '—',
      icon: <AppIcon icon={Building2} size={14} />,
    },
    {
      label: 'Land',
      value: reference.country ?? '—',
      icon: <AppIcon icon={Globe} size={14} />,
    },
    { label: 'Volumen', value: vol },
    { label: 'Projektstart', value: start },
    { label: 'Projektende', value: end },
  ]

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-10 space-y-4 text-center">
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

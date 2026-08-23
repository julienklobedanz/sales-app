'use client'

import { ReferenceDetailApprovalCard } from '@/app/(app)/references/[id]/reference-detail-approval-card'
import { ReferenceDetailHeader } from '@/app/(app)/references/[id]/reference-detail-header'
import { splitTags } from '@/app/(app)/references/[id]/reference-detail-helpers'
import { ReferenceReadinessActions } from '@/app/(app)/references/[id]/reference-readiness-actions'
import { ReferenceViewedTracker } from '@/app/(app)/references/[id]/reference-viewed-tracker'
import { deleteReferenceFromDetailPage } from '@/app/(app)/references/[id]/actions'
import type { ReferenceAssetRow, ReferenceRow } from '@/app/(app)/actions'
import { ReferenceContentCore } from '@/components/references/reference-content-core'
import { ReferenceObjectActions } from '@/components/references/reference-object-actions'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { formatEmployeeCountDeDisplay, type OrgDateDisplayFormat } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import {
  referenceInternalFrameSlotFill,
  type ReferenceInternalFrameHost,
} from '@/lib/references/reference-internal-frame'
import {
  referenceApprovalMetaHasContent,
  type ReferenceInternalFrameSupplement,
} from '@/lib/references/reference-internal-frame-supplement'
import {
  contentFilesFromAssets,
  usabilityFromReference,
} from '@/lib/references/reference-content-from-row'
import { shouldLogReferenceViewed } from '@/lib/references/reference-viewed'

function HeadActionsSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2" aria-busy>
      <Skeleton className="h-8 w-[5.5rem]" />
      <Skeleton className="h-8 w-[6.5rem]" />
      <Skeleton className="h-8 w-[6rem]" />
      <Skeleton className="h-8 w-[5.5rem]" />
    </div>
  )
}

export function ReferenceInternalFrame({
  host,
  row,
  supplement,
  supplementReady,
  assets,
  assetsLoading,
  onAssetsChange,
  externalContacts,
  canEdit,
  canDelete,
  isSalesView,
  orgDateFmt,
  autoOpenApprovalDialog = false,
  arrivedWithId,
  firstSelectedId,
  hasLeftInitialSelection,
}: {
  host: ReferenceInternalFrameHost
  row: ReferenceRow | null
  supplement: ReferenceInternalFrameSupplement | null
  supplementReady: boolean
  assets: ReferenceAssetRow[]
  assetsLoading: boolean
  onAssetsChange?: (assets: ReferenceAssetRow[]) => void
  externalContacts: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
  }[]
  canEdit: boolean
  canDelete: boolean
  isSalesView: boolean
  orgDateFmt: OrgDateDisplayFormat
  autoOpenApprovalDialog?: boolean
  arrivedWithId: boolean
  firstSelectedId: string | null
  hasLeftInitialSelection: boolean
}) {

  if (!row) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center"
        data-reference-internal-frame={host}
      >
        <div className="text-sm font-medium">Keine Auswahl</div>
        <div className="text-sm text-muted-foreground max-w-md">
          Wähle links eine Referenz aus. Rechts zeigen wir die Detail-Abschnitte im
          Split-Layout.
        </div>
      </div>
    )
  }

  const fill = referenceInternalFrameSlotFill({
    hasRow: true,
    isSalesView,
    approvalMetaReady: supplementReady,
    hasApprovalMeta: supplement
      ? referenceApprovalMetaHasContent(supplement.approvalMeta)
      : false,
  })
  const isAnonymized = row.status === 'anonymized'
  const tags = splitTags(row.tags)
  const ext = row.customer_contact_id
    ? externalContacts.find((c) => c.id === row.customer_contact_id)
    : undefined
  const customerDisplay =
    row.customer_contact ||
    (ext ? [ext.first_name, ext.last_name].filter(Boolean).join(' ') : null) ||
    null
  const usability = usabilityFromReference(row)
  const employeeRaw = row.employee_count
  const employeeMetaLabel =
    typeof employeeRaw === 'number' && Number.isFinite(employeeRaw)
      ? formatEmployeeCountDeDisplay(employeeRaw)
      : null
  const websiteRaw = (row.website ?? '').trim()
  const logViewed = shouldLogReferenceViewed({
    arrivedWithId,
    referenceId: row.id,
    firstSelectedId,
    hasLeftInitialSelection,
  })

  return (
    <div className="flex h-full flex-col" data-reference-internal-frame={host}>
      {logViewed ? (
        <ReferenceViewedTracker referenceId={row.id} enabled />
      ) : (
        <ReferenceViewedTracker referenceId={row.id} enabled={false} />
      )}
      <div className="border-b p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {fill.identity === 'filled' ? (
            <ReferenceDetailHeader
              title={row.title}
              status={row.status}
              customerApprovalStatus={row.customer_approval_status ?? null}
              approvalInternalStatus={row.approval_internal_status ?? null}
              approvalRequestedAt={row.approval_requested_at ?? null}
              approvalScopeNamedMention={row.approval_scope_named_mention ?? null}
              approvalScopeAnonymousMention={row.approval_scope_anonymous_mention ?? null}
              headerCompany={isAnonymized ? 'Anonymisierter Kunde' : row.company_name}
              companyId={isAnonymized ? null : row.company_id}
              isAnonymizedView={isAnonymized}
              industryLabel={formatIndustryDisplay(row.industry) || null}
              employeeMetaLabel={employeeMetaLabel}
              locationMetaLabel={(row.country ?? '').trim() || null}
              websiteMetaHref={
                !isAnonymized && websiteRaw
                  ? websiteRaw.startsWith('http')
                    ? websiteRaw
                    : `https://${websiteRaw}`
                  : null
              }
              tags={tags}
              isFavorited={row.is_favorited}
              favoriteReferenceId={row.id}
            />
          ) : null}
          {fill.headActions === 'filled' ? (
            !supplementReady ? (
              <HeadActionsSkeleton />
            ) : supplement ? (
              <ReferenceObjectActions
                referenceId={row.id}
                canEdit={canEdit}
                canDelete={canDelete}
                editHref={canEdit ? ROUTES.references.edit(row.id) : null}
                existingSharePath={supplement.existingSharePath}
                onDelete={
                  canDelete
                    ? deleteReferenceFromDetailPage.bind(null, row.id)
                    : undefined
                }
              >
                <ReferenceReadinessActions
                  referenceId={row.id}
                  readiness={supplement.readiness}
                  canStartApproval={supplement.canStartApproval}
                  canInternalApprove={supplement.canInternalApprove}
                  defaultAccountManagerEmail={supplement.defaultAccountManagerEmail}
                  autoOpenApprovalDialog={autoOpenApprovalDialog}
                  approvalContactId={supplement.approvalContactId}
                  approvalExternalContactId={supplement.approvalExternalContactId}
                  referenceContactId={supplement.referenceContactId}
                  referenceCustomerContactId={supplement.referenceCustomerContactId}
                  hasCustomerChangeRequests={supplement.hasCustomerChangeRequests}
                  canEditCustomerEmail={supplement.canEditCustomerEmail}
                  canEditCoordinatorEmail={supplement.canEditCoordinatorEmail}
                  customerChangeRequestComment={supplement.customerChangeRequestComment}
                />
              </ReferenceObjectActions>
            ) : (
              <ReferenceObjectActions
                referenceId={row.id}
                canEdit={canEdit}
                canDelete={canDelete}
                editHref={canEdit ? ROUTES.references.edit(row.id) : null}
                existingSharePath={null}
                onDelete={
                  canDelete
                    ? deleteReferenceFromDetailPage.bind(null, row.id)
                    : undefined
                }
              />
            )
          ) : null}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          {fill.content === 'filled' ? (
            <ReferenceContentCore
              surface="internal"
              summary={row.summary}
              challenge={row.customer_challenge}
              solution={row.our_solution}
              usabilityText={usability.text}
              competitorBlacklist={usability.blacklist}
              volumeEur={row.volume_eur}
              contractType={row.contract_type}
              projectStart={row.project_start}
              projectEnd={row.project_end}
              projectStatus={row.project_status}
              incumbentProvider={row.incumbent_provider}
              competitors={row.competitors}
              salesContact={row.contact_display}
              salesContactEmail={row.contact_email}
              customerContact={customerDisplay}
              customerContactEmail={ext?.email}
              customerContactRole={ext?.role}
              files={contentFilesFromAssets({
                assets,
                legacyFilePath: row.file_path,
              })}
              filesLoading={assetsLoading}
              canEditFileCategory={canEdit}
              onFilesChange={(next) => {
                onAssetsChange?.(
                  assets.map((asset) => {
                    const match = next.find((file) => file.assetId === asset.id)
                    return match?.category
                      ? { ...asset, category: match.category }
                      : asset
                  }),
                )
              }}
              dateFmt={orgDateFmt}
            />
          ) : null}
          {fill.approvalMeta === 'filled' && supplement ? (
            <ReferenceDetailApprovalCard
              isSalesView={isSalesView}
              {...supplement.approvalMeta}
            />
          ) : null}
        </div>
      </ScrollArea>
    </div>
  )
}

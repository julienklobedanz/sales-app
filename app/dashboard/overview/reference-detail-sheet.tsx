'use client'

import type { Dispatch, MouseEvent, SetStateAction } from 'react'
import Link from 'next/link'
import { Eye, LinkIcon, StarIcon } from '@hugeicons/core-free-icons'

import { ReferenceStatusWithHint } from '@/components/reference-status-with-hint'
import { ReferenceContentCore } from '@/components/references/reference-content-core'
import { ReferenceObjectActions } from '@/components/references/reference-object-actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  formatNumberDe,
  normalizeOrgDateDisplayFormat,
  type OrgDateDisplayFormat,
} from '@/lib/format'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import { isSystemAdmin } from '@/lib/roles/capability-access'
import {
  profileCanManageOrgData,
  profileIsSalesRestricted,
} from '@/lib/roles/profile-guards'
import {
  contentFilesFromAssets,
  usabilityFromReference,
} from '@/lib/references/reference-content-from-row'

import type { ReferenceAssetRow, ReferenceRow } from '../actions'
import type { Profile } from '../dashboard-types'

export type ReferenceDetailExternalContact = {
  id: string
  company_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  phone?: string | null
}

export function ReferenceDetailSheet({
  open,
  onOpenChange,
  selectedRef,
  profile,
  externalContacts,
  detailAssets,
  detailAssetsLoading,
  setDetailAssets,
  onToggleFavorite,
  onDelete,
  orgDateDisplayFormat = 'de-DE',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedRef: ReferenceRow | null
  profile: Profile
  externalContacts: ReferenceDetailExternalContact[]
  detailAssets: ReferenceAssetRow[]
  detailAssetsLoading: boolean
  setDetailAssets: Dispatch<SetStateAction<ReferenceAssetRow[]>>
  normalizeTagLabel: (raw: string) => string
  onToggleFavorite: (id: string, e?: MouseEvent) => void
  onOpenShareLink: (ref: ReferenceRow) => void
  onDelete: (id: string, e?: MouseEvent) => void
  orgDateDisplayFormat?: OrgDateDisplayFormat | string
}) {
  const dateFmt = normalizeOrgDateDisplayFormat(orgDateDisplayFormat)
  const canEdit = selectedRef ? isSystemAdmin(profile.systemRole) : false
  const canDelete = canEdit
  const canStartApproval = selectedRef
    ? (profileCanManageOrgData(profile.systemRole, profile.functionRole) &&
        selectedRef.status === 'draft') ||
      (profileIsSalesRestricted(profile.systemRole, profile.functionRole) &&
        selectedRef.status === 'internal_only')
    : false

  const ext = selectedRef?.customer_contact_id
    ? externalContacts.find((c) => c.id === selectedRef.customer_contact_id)
    : undefined
  const customerDisplay = selectedRef
    ? selectedRef.customer_contact ||
      (ext ? [ext.first_name, ext.last_name].filter(Boolean).join(' ') : null)
    : null
  const usability = selectedRef ? usabilityFromReference(selectedRef) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-6 sm:max-w-3xl lg:max-w-[61rem] xl:max-w-[68rem]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {selectedRef && usability ? (
          <TooltipProvider delayDuration={0}>
            <DialogHeader className="z-10 shrink-0 border-b bg-background px-0 pb-4 pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="truncate text-lg font-semibold leading-tight tracking-tight">
                      {selectedRef.title}
                    </DialogTitle>
                    <span className="shrink-0 text-lg font-semibold leading-tight tracking-tight text-muted-foreground">
                      |{' '}
                      {selectedRef.status === 'anonymized'
                        ? 'Anonymisierter Kunde'
                        : selectedRef.company_name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mt-1 h-6 w-6 shrink-0 hover:bg-transparent"
                      onClick={(e: MouseEvent) => onToggleFavorite(selectedRef.id, e)}
                    >
                      <AppIcon
                        icon={StarIcon}
                        size={16}
                        className={
                          selectedRef.is_favorited
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }
                      />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ReferenceStatusWithHint
                      status={selectedRef.status}
                      customerApprovalStatus={selectedRef.customer_approval_status}
                      approvalInternalStatus={selectedRef.approval_internal_status}
                      approvalRequestedAt={selectedRef.approval_requested_at}
                      approvalScopeNamedMention={selectedRef.approval_scope_named_mention}
                      approvalScopeAnonymousMention={
                        selectedRef.approval_scope_anonymous_mention
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <AppIcon icon={Eye} size={14} aria-hidden />
                  {formatNumberDe(selectedRef.total_share_views ?? 0)} Aufrufe
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5">
                      <AppIcon icon={LinkIcon} size={14} aria-hidden />
                      {(selectedRef.deal_link_count ?? 0) +
                        (selectedRef.share_link_count ?? 0)}{' '}
                      Verknüpfungen
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {selectedRef.deal_link_count ?? 0}× mit Deal verknüpft ·{' '}
                    {selectedRef.share_link_count ?? 0}× Kundenlink erstellt
                  </TooltipContent>
                </Tooltip>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
              <ReferenceContentCore
                surface="internal"
                summary={selectedRef.summary}
                challenge={selectedRef.customer_challenge}
                solution={selectedRef.our_solution}
                usabilityText={usability.text}
                competitorBlacklist={usability.blacklist}
                volumeEur={selectedRef.volume_eur}
                contractType={selectedRef.contract_type}
                projectStart={selectedRef.project_start}
                projectEnd={selectedRef.project_end}
                projectStatus={selectedRef.project_status}
                incumbentProvider={selectedRef.incumbent_provider}
                competitors={selectedRef.competitors}
                salesContact={selectedRef.contact_display}
                salesContactEmail={selectedRef.contact_email}
                customerContact={customerDisplay}
                customerContactEmail={ext?.email}
                customerContactRole={ext?.role}
                files={contentFilesFromAssets({
                  assets: detailAssets,
                  legacyFilePath: selectedRef.file_path,
                })}
                filesLoading={detailAssetsLoading}
                canEditFileCategory={canEdit}
                dateFmt={dateFmt}
                onFilesChange={(next) => {
                  setDetailAssets((prev) =>
                    prev.map((asset) => {
                      const match = next.find((file) => file.assetId === asset.id)
                      return match?.category
                        ? { ...asset, category: match.category }
                        : asset
                    }),
                  )
                }}
              />
            </div>

            <DialogFooter className="z-10 shrink-0 border-t bg-muted/20 px-0 pt-4 pb-0 sm:justify-end">
              <ReferenceObjectActions
                referenceId={selectedRef.id}
                canEdit={canEdit}
                canDelete={canDelete}
                editHref={canEdit ? ROUTES.references.edit(selectedRef.id) : null}
                onDelete={() => onDelete(selectedRef.id)}
              >
                {canStartApproval ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`${ROUTES.references.detail(selectedRef.id)}?startApproval=1`}
                    >
                      Freigabe
                    </Link>
                  </Button>
                ) : null}
              </ReferenceObjectActions>
            </DialogFooter>
          </TooltipProvider>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

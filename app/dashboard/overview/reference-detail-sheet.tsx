'use client'

import type { Dispatch, MouseEvent, SetStateAction } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Eye,
  LinkIcon,
  Pencil,
  Send,
  StarIcon,
  Trash2,
} from '@hugeicons/core-free-icons'

import { ReferenceStatusWithHint } from '@/components/reference-status-with-hint'
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

import type { ReferenceAssetRow, ReferenceRow } from '../actions'
import type { Profile } from '../dashboard-types'
import { ReferenceDetailFilesCard } from './reference-detail/reference-detail-files-card'
import {
  ReferenceDetailProjectCard,
  type ReferenceDetailExternalContact,
} from './reference-detail/reference-detail-project-card'
import { ReferenceDetailStoryCard } from './reference-detail/reference-detail-story-card'

export function ReferenceDetailSheet({
  open,
  onOpenChange,
  selectedRef,
  profile,
  externalContacts,
  detailAssets,
  detailAssetsLoading,
  setDetailAssets,
  normalizeTagLabel,
  onToggleFavorite,
  onOpenShareLink,
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
  const router = useRouter()
  const dateFmt = normalizeOrgDateDisplayFormat(orgDateDisplayFormat)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-6 sm:max-w-3xl lg:max-w-[61rem] xl:max-w-[68rem]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {selectedRef && (
          <TooltipProvider delayDuration={0}>
            {/* Fixierter Header */}
            <DialogHeader className="z-10 shrink-0 border-b bg-background px-0 pb-4 pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-lg font-semibold leading-tight tracking-tight truncate">
                      {selectedRef.title}
                    </DialogTitle>
                    <span className="text-muted-foreground text-lg font-semibold leading-tight tracking-tight shrink-0">
                      |{' '}
                      {selectedRef.status === 'anonymized'
                        ? 'Anonymisierter Kunde'
                        : selectedRef.company_name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 -mt-1 hover:bg-transparent"
                      onClick={(e: MouseEvent) => onToggleFavorite(selectedRef.id, e)}
                    >
                      <AppIcon
                        icon={StarIcon}
                        size={16}
                        className={
                          selectedRef.is_favorited
                            ? 'text-amber-500 dark:text-amber-400'
                            : 'text-muted-foreground hover:text-amber-500/80'
                        }
                      />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedRef.is_nda_deal ? (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100">
                        NDA-geschützt
                      </span>
                    ) : null}
                    <ReferenceStatusWithHint
                      status={selectedRef.status}
                      customerApprovalStatus={selectedRef.customer_approval_status}
                    />
                  </div>
                </div>
              </div>
              {/* Nutzungs-Statistik unter Freigabestufe: Views + Verknüpfungen */}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-muted-foreground text-xs">
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

            {/* Ein scrollbarer Bereich: gleiche 4-Karten-Struktur wie Referenz erstellen */}
            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
              <div className="space-y-6 pt-4">
                <ReferenceDetailStoryCard
                  selectedRef={selectedRef}
                  normalizeTagLabel={normalizeTagLabel}
                />
                <ReferenceDetailProjectCard
                  selectedRef={selectedRef}
                  externalContacts={externalContacts}
                  dateFmt={dateFmt}
                />
                <ReferenceDetailFilesCard
                  selectedRef={selectedRef}
                  profile={profile}
                  detailAssets={detailAssets}
                  detailAssetsLoading={detailAssetsLoading}
                  setDetailAssets={setDetailAssets}
                  dateFmt={dateFmt}
                />
              </div>
            </div>

            {/* Fixierter Footer (rollenabhängig) */}
            <DialogFooter className="z-10 shrink-0 flex-col gap-2 border-t bg-muted/20 px-0 pt-4 pb-0 sm:flex-row sm:items-center sm:justify-between">
              {/* Linke Seite: Download + Bearbeiten */}
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenShareLink(selectedRef)}
                  title="Kundenlink erstellen"
                >
                  <AppIcon icon={LinkIcon} size={16} className="mr-2" /> Kundenlink
                  erstellen
                </Button>
                {isSystemAdmin(profile.systemRole) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(ROUTES.references.edit(selectedRef.id))}
                  >
                    <AppIcon icon={Pencil} size={16} className="mr-2" /> Bearbeiten
                  </Button>
                )}
              </div>

              {/* Rechte Seite: Detail für Freigabe / Löschen */}
              <div className="flex w-full justify-end gap-2 sm:w-auto">
                {profileCanManageOrgData(profile.systemRole, profile.functionRole) &&
                selectedRef.status === 'draft' ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`${ROUTES.references.detail(selectedRef.id)}?startApproval=1`}
                    >
                      <AppIcon icon={Send} size={16} className="mr-2" />
                      Freigabe (Detail)
                    </Link>
                  </Button>
                ) : null}
                {profileIsSalesRestricted(profile.systemRole, profile.functionRole) &&
                selectedRef.status === 'internal_only' ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`${ROUTES.references.detail(selectedRef.id)}?startApproval=1`}
                    >
                      <AppIcon icon={Send} size={16} className="mr-2" />
                      Freigabe (Detail)
                    </Link>
                  </Button>
                ) : null}
                {isSystemAdmin(profile.systemRole) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e: MouseEvent) => onDelete(selectedRef.id, e)}
                  >
                    <AppIcon icon={Trash2} size={16} className="mr-2" /> Löschen
                  </Button>
                )}
              </div>
            </DialogFooter>
          </TooltipProvider>
        )}
      </DialogContent>
    </Dialog>
  )
}

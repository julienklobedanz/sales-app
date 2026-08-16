'use client'

import { StarIcon } from '@hugeicons/core-free-icons'

import { ReferenceStatusBadge } from '@/components/reference-status-badge'
import { ReferenceContentCore } from '@/components/references/reference-content-core'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReferenceAssetRow } from '@/app/dashboard/actions'
import { toggleFavorite } from '@/app/dashboard/actions'
import { AppIcon } from '@/lib/icons'
import {
  contentFilesFromAssets,
  usabilityFromReference,
} from '@/lib/references/reference-content-from-row'

import type { ConceptReferenceRow } from './types'
import { splitTags } from './types'

export function ReferenceDetailPane({
  selectedRef,
  isAdmin,
  externalContacts,
  assets,
  assetsLoading,
  detailLoading,
  onAssetsChange,
}: {
  selectedRef: ConceptReferenceRow | null
  isAdmin: boolean
  externalContacts: {
    id: string
    company_id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    phone?: string | null
  }[]
  assets: ReferenceAssetRow[]
  assetsLoading: boolean
  detailLoading: boolean
  onAssetsChange?: (assets: ReferenceAssetRow[]) => void
}) {
  if (!selectedRef) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <div className="text-sm font-medium">Keine Auswahl</div>
        <div className="text-sm text-muted-foreground max-w-md">
          Wähle links eine Referenz aus. Rechts zeigen wir die Detail-Abschnitte im
          Split-Layout.
        </div>
      </div>
    )
  }

  if (detailLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <Skeleton className="mt-0.5 h-11 w-11 rounded-md" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-5 w-[320px] max-w-[60vw]" />
                <Skeleton className="h-4 w-[220px] max-w-[45vw]" />
              </div>
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-24 w-full" />
          </div>
        </ScrollArea>
      </div>
    )
  }

  const tags = splitTags(selectedRef.tags)
  const ext = selectedRef.customer_contact_id
    ? externalContacts.find((c) => c.id === selectedRef.customer_contact_id)
    : undefined
  const customerDisplay =
    selectedRef.customer_contact ||
    (ext ? [ext.first_name, ext.last_name].filter(Boolean).join(' ') : null) ||
    null
  const usability = usabilityFromReference(selectedRef)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="mt-0.5 shrink-0">
              {selectedRef.company_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedRef.company_logo_url}
                  alt=""
                  className="h-11 w-11 rounded-md border object-contain bg-background"
                />
              ) : (
                <div className="h-11 w-11 rounded-md border bg-muted/40" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-start gap-2">
                <div className="text-lg font-semibold leading-snug break-words">
                  {selectedRef.title}
                </div>
                <form action={toggleFavorite.bind(null, selectedRef.id)}>
                  <button
                    type="submit"
                    className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={
                      selectedRef.is_favorited ? 'Favorit entfernen' : 'Favorisieren'
                    }
                  >
                    <AppIcon
                      icon={StarIcon}
                      size={16}
                      className={
                        selectedRef.is_favorited ? 'text-foreground' : 'opacity-80'
                      }
                    />
                  </button>
                </form>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {selectedRef.status === 'anonymized'
                  ? 'Anonymisierter Kunde'
                  : selectedRef.company_name}
              </div>
            </div>
          </div>
          <div className="shrink-0 pt-0.5">
            <ReferenceStatusBadge
              status={selectedRef.status}
              customerApprovalStatus={selectedRef.customer_approval_status}
              approvalInternalStatus={selectedRef.approval_internal_status}
              approvalRequestedAt={selectedRef.approval_requested_at}
              approvalScopeNamedMention={selectedRef.approval_scope_named_mention}
              approvalScopeAnonymousMention={selectedRef.approval_scope_anonymous_mention}
            />
          </div>
        </div>
        {tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="rounded-md">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
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
              assets,
              legacyFilePath: selectedRef.file_path,
            })}
            filesLoading={assetsLoading}
            canEditFileCategory={isAdmin}
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
          />
        </div>
      </ScrollArea>
    </div>
  )
}

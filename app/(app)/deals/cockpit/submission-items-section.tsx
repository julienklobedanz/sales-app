'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CirclePlus } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { COPY } from '@/lib/copy'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import {
  isReferenceListItem,
  isUnreviewedSubmissionItem,
  type SubmissionItemState,
} from '@/lib/deals/submission-item-display'
import type {
  SubmissionItemView,
  SubmissionWorkspaceLotProof,
} from '@/lib/deals/load-submission-workspace'
import {
  assignSubmissionItemAction,
  attachSubmissionItemDocumentAction,
  createManualSubmissionItemAction,
  cycleSubmissionItemStateAction,
  reviewSubmissionItemAction,
} from '../submission-actions'

function stateLabel(state: SubmissionItemState): string {
  if (state === 'provided') return COPY.deals.cockpit.submissionItemsStateProvided
  if (state === 'not_applicable')
    return COPY.deals.cockpit.submissionItemsStateNotApplicable
  return COPY.deals.cockpit.submissionItemsStateOpen
}

function SubmissionItemRow({
  item,
  ownerKind,
  ownerId,
  deadlineId,
  canMutate,
  showAssign,
  documents,
  lotProofs,
}: {
  item: SubmissionItemView
  ownerKind: 'tender' | 'deal'
  ownerId: string
  deadlineId: string | null
  canMutate: boolean
  showAssign: boolean
  documents: Array<{ id: string; fileName: string }>
  lotProofs: SubmissionWorkspaceLotProof[]
}) {
  const [pickOpen, setPickOpen] = useState(false)
  const unreviewed = isUnreviewedSubmissionItem(item)
  const originLost = item.source === 'extracted' && item.sourceDocumentId == null

  async function run(
    fn: () => Promise<{ success: boolean; error?: string }>,
    ok?: string,
  ) {
    const res = await fn()
    if (!res.success) toast.error(res.error ?? 'Speichern fehlgeschlagen.')
    else if (ok) toast.success(ok)
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {item.identifier ? (
              <span className="mr-2 tabular-nums text-muted-foreground">
                {item.identifier}
              </span>
            ) : null}
            {item.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isReferenceListItem(item.title) ? (
              lotProofs.length === 0 ? (
                COPY.deals.cockpit.submissionItemsReferenceProof
              ) : (
                lotProofs.map((lot, index) => (
                  <span key={lot.id}>
                    {index > 0 ? <span aria-hidden> · </span> : null}
                    <Link href={ROUTES.deals.detail(lot.id)} className="hover:underline">
                      {COPY.deals.cockpit.submissionItemsLotProof
                        .replace('{title}', lot.title)
                        .replace('{count}', String(lot.count))}
                    </Link>
                  </span>
                ))
              )
            ) : item.proofFileName ? (
              item.proofFileName
            ) : canMutate ? (
              <Popover open={pickOpen} onOpenChange={setPickOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="hover:underline">
                    {COPY.deals.cockpit.submissionItemsPickDocument}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-2">
                  {documents.length === 0 ? (
                    <p className="px-2 py-1 text-sm text-muted-foreground">
                      {COPY.deals.cockpit.submissionItemsNoDocuments}
                    </p>
                  ) : (
                    <ul className="flex flex-col">
                      {documents.map((doc) => (
                        <li key={doc.id}>
                          <button
                            type="button"
                            className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                            onClick={() =>
                              run(() =>
                                attachSubmissionItemDocumentAction({
                                  ownerKind,
                                  ownerId,
                                  itemId: item.id,
                                  documentId: doc.id,
                                }),
                              ).then(() => setPickOpen(false))
                            }
                          >
                            {doc.fileName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </PopoverContent>
              </Popover>
            ) : (
              '—'
            )}
          </p>
          {originLost ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {COPY.deals.cockpit.submissionItemsOriginLost}
            </p>
          ) : null}
          {unreviewed && canMutate ? (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{COPY.deals.cockpit.submissionItemsReviewHint}</span>
              <button
                type="button"
                className="hover:underline"
                onClick={() =>
                  run(() =>
                    reviewSubmissionItemAction({
                      ownerKind,
                      ownerId,
                      itemId: item.id,
                      review: 'confirmed',
                    }),
                  )
                }
              >
                {COPY.deals.cockpit.submissionItemsReviewConfirm}
              </button>
              <button
                type="button"
                className="hover:underline"
                onClick={() =>
                  run(() =>
                    reviewSubmissionItemAction({
                      ownerKind,
                      ownerId,
                      itemId: item.id,
                      review: 'dismissed',
                    }),
                  )
                }
              >
                {COPY.deals.cockpit.submissionItemsReviewDismiss}
              </button>
            </p>
          ) : unreviewed ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {COPY.deals.cockpit.submissionItemsReviewHint}
            </p>
          ) : null}
        </div>
        {showAssign && deadlineId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              run(
                () =>
                  assignSubmissionItemAction({
                    ownerKind,
                    ownerId,
                    itemId: item.id,
                    deadlineId,
                  }),
                COPY.deals.cockpit.submissionItemsAssignSuccess,
              )
            }
          >
            {COPY.deals.cockpit.submissionItemsAssignToThis}
          </Button>
        ) : null}
        {canMutate && item.deadlineId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (item.state === 'open' && !item.proofFileName) {
                setPickOpen(true)
              }
              run(() =>
                cycleSubmissionItemStateAction({
                  ownerKind,
                  ownerId,
                  itemId: item.id,
                }),
              )
            }}
          >
            {stateLabel(item.state)}
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">{stateLabel(item.state)}</span>
        )}
      </div>
    </li>
  )
}

export function SubmissionItemsSection({
  ownerKind,
  ownerId,
  deadlineId,
  title,
  items,
  unassignedItems,
  canMutate,
  markedCount,
  documents,
  lotProofs,
  emptyKind,
}: {
  ownerKind: 'tender' | 'deal'
  ownerId: string
  deadlineId: string | null
  title: string
  items: SubmissionItemView[]
  unassignedItems: SubmissionItemView[]
  canMutate: boolean
  markedCount: number
  documents: Array<{ id: string; fileName: string }>
  lotProofs: SubmissionWorkspaceLotProof[]
  emptyKind: 'no-target' | 'empty-list' | null
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [titleValue, setTitleValue] = useState('')
  const showAssign = canMutate && markedCount >= 2 && Boolean(deadlineId)

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className={items.length > 0 ? 'pb-3' : undefined}>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">{title}</CardTitle>
            {canMutate && deadlineId ? (
              <Popover open={addOpen} onOpenChange={setAddOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    <AppIcon icon={CirclePlus} size={16} className="mr-1" />
                    {COPY.deals.cockpit.submissionItemsAdd}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 space-y-3">
                  <p className="text-sm font-medium">
                    {COPY.deals.cockpit.submissionItemsAddTitle}
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor="sub-id">
                      {COPY.deals.cockpit.submissionItemsIdentifier}
                    </Label>
                    <Input
                      id="sub-id"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sub-title">
                      {COPY.deals.cockpit.submissionItemsTitleLabel}
                    </Label>
                    <Input
                      id="sub-title"
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      const res = await createManualSubmissionItemAction({
                        ownerKind,
                        ownerId,
                        deadlineId,
                        identifier,
                        title: titleValue,
                      })
                      if (!res.success) {
                        toast.error(res.error ?? 'Speichern fehlgeschlagen.')
                        return
                      }
                      toast.success(COPY.deals.cockpit.submissionItemsAddSuccess)
                      setIdentifier('')
                      setTitleValue('')
                      setAddOpen(false)
                    }}
                  >
                    {COPY.deals.cockpit.submissionItemsAdd}
                  </Button>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
          {emptyKind === 'no-target' ? (
            <CardDescription>
              {COPY.deals.cockpit.submissionItemsEmptyNoTarget}
            </CardDescription>
          ) : null}
          {emptyKind === 'empty-list' ? (
            <CardDescription>{COPY.deals.cockpit.submissionItemsEmpty}</CardDescription>
          ) : null}
        </CardHeader>
        {items.length > 0 ? (
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {items.map((item) => (
                <SubmissionItemRow
                  key={item.id}
                  item={item}
                  ownerKind={ownerKind}
                  ownerId={ownerId}
                  deadlineId={deadlineId}
                  canMutate={canMutate}
                  showAssign={false}
                  documents={documents}
                  lotProofs={lotProofs}
                />
              ))}
            </ul>
          </CardContent>
        ) : null}
      </Card>

      {unassignedItems.length > 0 ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {COPY.deals.cockpit.submissionItemsUnassignedTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {unassignedItems.map((item) => (
                <SubmissionItemRow
                  key={item.id}
                  item={item}
                  ownerKind={ownerKind}
                  ownerId={ownerId}
                  deadlineId={deadlineId}
                  canMutate={canMutate}
                  showAssign={showAssign}
                  documents={documents}
                  lotProofs={lotProofs}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

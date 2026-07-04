'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MoreHorizontal } from '@hugeicons/core-free-icons'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'

import type { DealWithReferences } from '../types'
import { deleteDeal, setDealRfpMode } from '../actions'
import { EditDealDialog } from '../components/edit-deal-dialog'
import { LinkReferenceDialog } from '../components/link-reference-dialog'
import { OutcomeDialog } from '../components/outcome-dialog'

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

export function DealCockpitActions({
  deal,
  companies,
  orgProfiles,
  canManage,
}: {
  deal: DealWithReferences
  companies: Company[]
  orgProfiles: OrgProfile[]
  canManage: boolean
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [outcomeOpen, setOutcomeOpen] = useState(false)
  const [demotePending, setDemotePending] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePending, setDeletePending] = useState(false)

  const linkedRefIds = deal.references.map((r) => r.id)

  async function demoteFromRfp() {
    setDemotePending(true)
    try {
      const res = await setDealRfpMode(deal.id, false)
      if (!res.success) {
        toast.error(res.error ?? 'Konnte RFP-Modus nicht ändern.')
        return
      }
      toast.success('Deal ist kein Ausschreibungs-Deal mehr.')
      router.refresh()
    } finally {
      setDemotePending(false)
    }
  }

  async function confirmDeleteDeal() {
    setDeletePending(true)
    try {
      const res = await deleteDeal(deal.id)
      if (!res.success) {
        toast.error(res.error ?? COPY.deals.cockpit.deleteDealFailed)
        return
      }
      toast.success(COPY.deals.cockpit.deleteDealSuccess)
      setDeleteOpen(false)
      router.push(ROUTES.deals.root)
      router.refresh()
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <AppIcon icon={MoreHorizontal} size={16} className="mr-1" />
            {COPY.deals.cockpit.actionsMenu}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Bearbeiten</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setLinkOpen(true)}>Referenz verknüpfen</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOutcomeOpen(true)}>Ausgang festhalten</DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${ROUTES.deals.requestNew}?dealId=${encodeURIComponent(deal.id)}`}>
              Referenzbedarf melden
            </Link>
          </DropdownMenuItem>
          {deal.is_rfp_mode ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={demotePending} onSelect={() => void demoteFromRfp()}>
                {COPY.deals.cockpit.demoteFromRfp}
              </DropdownMenuItem>
            </>
          ) : null}
          {canManage ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                {COPY.deals.cockpit.deleteDeal}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{COPY.deals.cockpit.deleteDealConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              {COPY.deals.cockpit.deleteDealDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void confirmDeleteDeal()
              }}
            >
              {deletePending ? COPY.deals.cockpit.deleteDealPending : COPY.deals.cockpit.deleteDeal}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditDealDialog
        deal={deal}
        companies={companies}
        orgProfiles={orgProfiles}
        open={editOpen}
        onOpenChange={setEditOpen}
        showTrigger={false}
      />
      <LinkReferenceDialog
        dealId={deal.id}
        linkedRefIds={linkedRefIds}
        open={linkOpen}
        onOpenChange={setLinkOpen}
        showTrigger={false}
      />
      <OutcomeDialog dealId={deal.id} open={outcomeOpen} onOpenChange={setOutcomeOpen} showTrigger={false} />
    </>
  )
}

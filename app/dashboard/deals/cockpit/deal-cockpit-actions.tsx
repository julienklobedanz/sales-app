'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MoreHorizontal } from '@hugeicons/core-free-icons'

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
import { setDealRfpMode } from '../actions'
import { EditDealDialog } from '../components/edit-deal-dialog'
import { LinkReferenceDialog } from '../components/link-reference-dialog'
import { OutcomeDialog } from '../components/outcome-dialog'

type Company = { id: string; name: string }
type OrgProfile = { id: string; full_name: string | null }

export function DealCockpitActions({
  deal,
  companies,
  orgProfiles,
}: {
  deal: DealWithReferences
  companies: Company[]
  orgProfiles: OrgProfile[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [outcomeOpen, setOutcomeOpen] = useState(false)
  const [demotePending, setDemotePending] = useState(false)

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
        </DropdownMenuContent>
      </DropdownMenu>

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

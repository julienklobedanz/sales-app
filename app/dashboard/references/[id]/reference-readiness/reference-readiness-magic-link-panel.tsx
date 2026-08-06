'use client'

import { ExternalLink, LinkIcon, Pencil, Send } from '@hugeicons/core-free-icons'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppIcon } from '@/lib/icons'
import type { ReferenceReadinessState } from '@/lib/references/reference-readiness-state'

export function ReferenceReadinessMagicLinkPanel({
  readiness,
  pending,
  showRequestApprovalAgain,
  canEditCustomerEmail,
  onRequestApprovalAgain,
  onOpenEditRecipient,
  onCopyApprovalLink,
  onOpenApprovalLink,
  onOpenRegenerate,
  onWithdraw,
}: {
  readiness: ReferenceReadinessState
  pending: boolean
  showRequestApprovalAgain: boolean
  canEditCustomerEmail: boolean
  onRequestApprovalAgain: () => void
  onOpenEditRecipient: () => void
  onCopyApprovalLink: () => void
  onOpenApprovalLink: () => void
  onOpenRegenerate: () => void
  onWithdraw: () => void
}) {
  if (!readiness.showMagicLink) return null

  return (
    <div className="flex w-full max-w-sm flex-col items-stretch gap-1.5 transition-opacity duration-200">
      <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {readiness.phase === 'pending_customer' ? 'Kunden-Freigabe' : 'Freigabe-Link'}
      </p>
      {showRequestApprovalAgain ? (
        <Button
          type="button"
          variant="default"
          className="w-full gap-2"
          onClick={onRequestApprovalAgain}
          disabled={pending}
        >
          <AppIcon icon={Send} size={16} />
          Freigabe erneut anfragen
        </Button>
      ) : null}
      {canEditCustomerEmail ? (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={onOpenEditRecipient}
          disabled={pending}
        >
          <AppIcon icon={Pencil} size={16} />
          Kunden E-Mail ändern
        </Button>
      ) : null}
      <Button
        type="button"
        variant={showRequestApprovalAgain ? 'outline' : 'default'}
        className="w-full gap-2"
        onClick={onCopyApprovalLink}
        disabled={pending}
      >
        <AppIcon icon={LinkIcon} size={16} />
        Freigabe-Link kopieren
      </Button>
      {readiness.showRegenerateLink ? (
        <div className="flex w-full">
          <Button
            type="button"
            variant="outline"
            className="min-w-0 flex-1 gap-2 rounded-r-none"
            onClick={onOpenApprovalLink}
            disabled={pending}
          >
            <AppIcon icon={ExternalLink} size={16} />
            Freigabe-Seite öffnen
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 rounded-l-none border-l-0 px-2.5"
                disabled={pending}
                aria-label="Weitere Freigabe-Aktionen"
              >
                <ChevronDown className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onOpenRegenerate}>
                Neuer Freigabe-Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={onOpenApprovalLink}
          disabled={pending}
        >
          <AppIcon icon={ExternalLink} size={16} />
          Freigabe-Seite öffnen
        </Button>
      )}
      {readiness.showWithdraw ? (
        <Button
          type="button"
          variant="outline"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onWithdraw}
          disabled={pending}
        >
          Anfrage widerrufen
        </Button>
      ) : null}
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Shield } from 'lucide-react'
import { toast } from 'sonner'

import {
  getCustomerApprovalRecipientEmail,
  resetSharedPortfolioManageToken,
} from '@/app/dashboard/actions'
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

function absolutePublicUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (typeof window === 'undefined') return clean
  return new URL(clean, window.location.origin).toString()
}

function buildManageUrl(absolutePublicUrl: string, manageToken: string): string {
  const u = new URL(absolutePublicUrl)
  u.searchParams.set('manage', manageToken)
  u.searchParams.set('mode', 'revoke')
  return u.toString()
}

export function ReferenceReadinessShowcaseLinks({
  referenceId,
  publicPreviewPath,
}: {
  referenceId: string
  publicPreviewPath: string
}) {
  const [pending, startTransition] = useTransition()
  const [issuingRevoke, setIssuingRevoke] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)

  function onOpenCustomer() {
    window.open(absolutePublicUrl(publicPreviewPath), '_blank', 'noopener,noreferrer')
  }

  async function runRevokeWithNewToken(notifyCustomer: boolean) {
    setIssuingRevoke(true)
    startTransition(async () => {
      try {
        const res = await resetSharedPortfolioManageToken(referenceId, { notifyCustomer })
        if (!res.success) {
          toast.error(res.error)
          return
        }
        const revokeUrl = buildManageUrl(
          absolutePublicUrl(publicPreviewPath),
          res.manageToken,
        )
        window.open(revokeUrl, '_blank', 'noopener,noreferrer')
        if (notifyCustomer) {
          if (res.customerEmailSent) {
            toast.success('Sperr-Ansicht geöffnet', {
              description: `Neuer Sperrlink wurde an ${customerEmail ?? 'den Kunden'} gesendet.`,
              duration: 8000,
            })
          } else {
            toast.success('Sperr-Ansicht geöffnet', {
              description:
                'Sperrlink erneuert — E-Mail konnte nicht gesendet werden (z. B. fehlender Resend-Key).',
              duration: 8000,
            })
          }
        } else {
          toast.success('Sperr-Ansicht geöffnet', {
            description: 'Der Sperr-Link wurde erneuert.',
            duration: 8000,
          })
        }
      } finally {
        setIssuingRevoke(false)
        setConfirmOpen(false)
      }
    })
  }

  async function onOpenRevoke() {
    const email = await getCustomerApprovalRecipientEmail(referenceId)
    if (email?.includes('@')) {
      setCustomerEmail(email)
      setConfirmOpen(true)
      return
    }
    void runRevokeWithNewToken(false)
  }

  return (
    <>
      <div className="flex w-full max-w-sm flex-col gap-2 border-t border-border/60 pt-3">
        <p className="text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Kundenansicht
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={onOpenCustomer}
          disabled={pending || issuingRevoke}
        >
          <ExternalLink className="size-4" />
          Kundenlink öffnen
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-amber-200/90 text-amber-950 hover:bg-amber-50/80 dark:border-amber-500/30 dark:text-amber-100 dark:hover:bg-amber-500/10"
          onClick={() => void onOpenRevoke()}
          disabled={pending || issuingRevoke}
        >
          <Shield className="size-4" />
          {issuingRevoke ? 'Sperr-Ansicht wird geladen…' : 'Sperr-Ansicht öffnen'}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Neuen Sperrlink erzeugen?</AlertDialogTitle>
            <AlertDialogDescription>
              Es wird ein neuer Sperrlink generiert und automatisch per Mail an deinen
              Kunden <span className="font-medium text-foreground">{customerEmail}</span>{' '}
              geschickt. Möchtest du fortfahren?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={issuingRevoke}>Nein</AlertDialogCancel>
            <AlertDialogAction
              disabled={issuingRevoke}
              onClick={(e) => {
                e.preventDefault()
                void runRevokeWithNewToken(true)
              }}
            >
              Ja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

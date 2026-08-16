'use client'

import { useState, useTransition } from 'react'
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

function absolutePublicUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (typeof window === 'undefined') return clean
  return new URL(clean, window.location.origin).toString()
}

function buildManageUrl(absoluteUrl: string, manageToken: string): string {
  const u = new URL(absoluteUrl)
  u.searchParams.set('manage', manageToken)
  u.searchParams.set('mode', 'revoke')
  return u.toString()
}

export function useSperrAnsicht(referenceId: string, publicPreviewPath: string | null) {
  const [pending, startTransition] = useTransition()
  const [issuingRevoke, setIssuingRevoke] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)

  async function runRevokeWithNewToken(notifyCustomer: boolean) {
    if (!publicPreviewPath) return
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
    if (!publicPreviewPath) return
    const email = await getCustomerApprovalRecipientEmail(referenceId)
    if (email?.includes('@')) {
      setCustomerEmail(email)
      setConfirmOpen(true)
      return
    }
    void runRevokeWithNewToken(false)
  }

  return {
    pending,
    issuingRevoke,
    onOpenRevoke,
    confirmOpen,
    setConfirmOpen,
    customerEmail,
    runRevokeWithNewToken,
  }
}

export function SperrAnsichtConfirmDialog({
  open,
  onOpenChange,
  customerEmail,
  issuingRevoke,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerEmail: string | null
  issuingRevoke: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
              onConfirm()
            }}
          >
            Ja
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

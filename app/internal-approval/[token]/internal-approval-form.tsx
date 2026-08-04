'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROUTES } from '@/lib/routes'
import { isApprovalRecipientEmail } from '@/lib/references/approval-recipient-input'

import { confirmInternalApprovalAction, delegateInternalApprovalAction } from './actions'

type Props = {
  token: string
  referenceId: string
  referenceTitle: string
  accountCompanyName: string
  requesterName: string
  message: string | null
  coordinatorEmail: string | null
}

export function InternalApprovalForm({
  token,
  referenceId,
  referenceTitle,
  accountCompanyName,
  requesterName,
  message,
  coordinatorEmail,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [delegateEmail, setDelegateEmail] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [delegatedTo, setDelegatedTo] = useState<string | null>(null)

  const detailHref = ROUTES.references.detail(referenceId)

  function onConfirm() {
    startTransition(async () => {
      const result = await confirmInternalApprovalAction(token)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setConfirmed(true)
      toast.success(
        result.alreadyApproved
          ? 'War bereits intern freigegeben.'
          : 'Interne Freigabe bestätigt.',
      )
      router.refresh()
    })
  }

  function onDelegate() {
    const email = delegateEmail.trim()
    if (!isApprovalRecipientEmail(email)) {
      toast.error('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    startTransition(async () => {
      const result = await delegateInternalApprovalAction(token, email)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setDelegatedTo(result.delegatedToEmail)
      if (result.emailSent) {
        toast.success(`Interne Freigabe wurde an ${result.delegatedToEmail} delegiert.`)
      } else {
        toast.success(
          `Verantwortung übertragen an ${result.delegatedToEmail}. E-Mail-Versand nicht möglich — bitte die Person direkt informieren.`,
        )
      }
    })
  }

  if (delegatedTo) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Die interne Freigabe wurde an{' '}
          <span className="font-medium text-foreground">{delegatedTo}</span> delegiert.
          Dieser Link ist nicht mehr gültig.
        </p>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Die Referenz „{referenceTitle}“ ist intern freigegeben. Als Nächstes kann in
          RefStack die Kundenfreigabe vorbereitet werden.
        </p>
        <Button asChild className="w-full">
          <Link href={detailHref}>Zur Referenz in RefStack</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left">
      <div className="space-y-2 text-sm text-muted-foreground">
        {requesterName ? (
          <p>
            <span className="font-medium text-foreground">{requesterName}</span> hat eine
            Kundenfreigabe zur internen Prüfung eingereicht.
          </p>
        ) : (
          <p>Es liegt eine neue Freigabe zur internen Prüfung vor.</p>
        )}
        <p>
          Referenz: <span className="font-medium text-foreground">{referenceTitle}</span>
          <br />
          Account:{' '}
          <span className="font-medium text-foreground">{accountCompanyName}</span>
        </p>
        {coordinatorEmail ? (
          <p className="text-xs">
            Aktuell zuständig: <span className="text-foreground">{coordinatorEmail}</span>
          </p>
        ) : null}
        {message?.trim() ? (
          <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs text-foreground">
            {message.trim()}
          </p>
        ) : null}
      </div>

      <Button type="button" className="w-full" onClick={onConfirm} disabled={pending}>
        Intern freigeben
      </Button>

      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            An andere Person delegieren
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Die neue Person erhält eine E-Mail mit einem eigenen Link zur internen
            Freigabe. Ihr Link verliert danach die Gültigkeit.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="delegate-internal-email">
            E-Mail der neuen Verantwortlichen
          </Label>
          <Input
            id="delegate-internal-email"
            type="email"
            value={delegateEmail}
            onChange={(e) => setDelegateEmail(e.target.value)}
            placeholder="name@firma.de"
            disabled={pending}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onDelegate}
          disabled={pending || !delegateEmail.trim()}
        >
          Delegieren
        </Button>
      </div>
    </div>
  )
}

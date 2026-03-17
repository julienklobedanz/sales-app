'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createCheckoutSession, createPortalSession } from './stripe-actions'

type Props = {
  subscriptionStatus: string | null
  subscriptionId: string | null
}

export function SettingsBillingCard({ subscriptionStatus, subscriptionId }: Props) {
  const [pendingPortal, startPortalTransition] = useTransition()
  const [pendingCheckout, startCheckoutTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(subscriptionStatus)

  const hasActiveSub =
    (localStatus ?? subscriptionStatus)?.toLowerCase() === 'active' ||
    Boolean(subscriptionId)

  const stripeConfigured =
    typeof process !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  async function handleCheckout() {
    startCheckoutTransition(async () => {
      const result = await createCheckoutSession()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setLocalStatus('active')
      window.location.href = result.url
    })
  }

  async function handlePortal() {
    startPortalTransition(async () => {
      const result = await createPortalSession()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      window.location.href = result.url
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        <CreditCard className="h-5 w-5" />
        <span className="text-sm font-medium uppercase tracking-wider">
          Abonnement
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Verwalte dein Abo, Zahlungsmethode und Rechnungen sicher über das Stripe Customer Portal.
      </p>

      {!stripeConfigured ? (
        <Button size="sm" variant="outline" disabled>
          Stripe nicht konfiguriert
        </Button>
      ) : hasActiveSub ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Status:{' '}
            <span className="font-medium text-foreground">
              Aktiv
            </span>
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePortal}
            disabled={pendingPortal}
          >
            {pendingPortal && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Abo verwalten
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Du nutzt aktuell die Basis-Version. Upgrade auf <span className="font-medium">Pro</span>, um alle Funktionen freizuschalten.
          </p>
          <Button
            size="sm"
            className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            onClick={handleCheckout}
            disabled={pendingCheckout}
          >
            {pendingCheckout && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Jetzt upgraden
          </Button>
        </div>
      )}
    </div>
  )
}

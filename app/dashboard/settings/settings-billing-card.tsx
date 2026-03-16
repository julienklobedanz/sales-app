'use client'

import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'

const STRIPE_PORTAL_URL = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL || ''

export function SettingsBillingCard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        <CreditCard className="h-5 w-5" />
        <span className="text-sm font-medium uppercase tracking-wider">
          Abonnement
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Verwalte dein Abo, Zahlungsmethode und Rechnungen.
      </p>
      {STRIPE_PORTAL_URL ? (
        <Button asChild size="sm" variant="outline">
          <a
            href={STRIPE_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrechnung öffnen
          </a>
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled>
          Abrechnung (Stripe nicht konfiguriert)
        </Button>
      )}
    </div>
  )
}

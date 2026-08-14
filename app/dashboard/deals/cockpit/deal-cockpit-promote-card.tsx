'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { COPY } from '@/lib/copy'

import { setDealRfpMode } from '../actions'

export function DealCockpitPromoteCard({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function promote() {
    setPending(true)
    try {
      const res = await setDealRfpMode(dealId, true)
      if (!res.success) {
        toast.error(res.error ?? 'Konnte Ausschreibungs-Modus nicht aktivieren.')
        return
      }
      toast.success('Deal als Ausschreibung markiert.')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Formale Ausschreibung mit Eignungs-Check, Antwort-Entwürfen und Bid-Analyse?
        </p>
        <Button type="button" size="sm" onClick={() => void promote()} disabled={pending}>
          {COPY.deals.cockpit.promoteToRfp}
        </Button>
      </CardContent>
    </Card>
  )
}

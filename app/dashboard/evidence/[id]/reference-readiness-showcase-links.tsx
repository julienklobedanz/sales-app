'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { resetSharedPortfolioManageToken } from '@/app/dashboard/actions'
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

  function onOpenCustomer() {
    window.open(absolutePublicUrl(publicPreviewPath), '_blank', 'noopener,noreferrer')
  }

  function onOpenRevoke() {
    setIssuingRevoke(true)
    startTransition(async () => {
      try {
        const res = await resetSharedPortfolioManageToken(referenceId)
        if (!res.success) {
          toast.error(res.error)
          return
        }
        const revokeUrl = buildManageUrl(absolutePublicUrl(publicPreviewPath), res.manageToken)
        window.open(revokeUrl, '_blank', 'noopener,noreferrer')
        toast.message('Sperr-Ansicht geöffnet', {
          description:
            'Der Sperr-Link wurde erneuert — bitte nur an die freigebende Person weitergeben.',
          duration: 8000,
        })
      } finally {
        setIssuingRevoke(false)
      }
    })
  }

  return (
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
  )
}

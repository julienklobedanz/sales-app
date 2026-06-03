'use client'

import { useState } from 'react'
import { Loader2, Paperclip, Send, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import { sendDealDeskRedFlagsToLegalAction } from '@/app/dashboard/deal-desk/actions'
import { BidOverviewCollapsibleCard } from '@/app/dashboard/deal-desk/components/bid-overview-collapsible-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { isValidBidTeamEmail } from '@/lib/deal-desk/bid-team'
import type { DealDeskRedFlag } from '@/lib/deal-desk/mock-analysis'
import { cn } from '@/lib/utils'

const RED_FLAGS_MAX_VISIBLE = 5

function severityStyles(severity: DealDeskRedFlag['severity']) {
  if (severity === 'critical') {
    return {
      border: 'border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30',
      badge: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100',
    }
  }
  if (severity === 'high') {
    return {
      border: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/25',
      badge: 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100',
    }
  }
  return {
    border: 'border-border bg-muted/40',
    badge: 'bg-muted text-muted-foreground',
  }
}

type Props = {
  flags: DealDeskRedFlag[]
  projectId: string
  onFlagsChange: (flags: DealDeskRedFlag[]) => void
  className?: string
  defaultOpen?: boolean
}

export function RedFlagsPanel({
  flags,
  projectId,
  onFlagsChange,
  className,
  defaultOpen = true,
}: Props) {
  const [legalSendOpen, setLegalSendOpen] = useState(false)
  const [legalEmail, setLegalEmail] = useState('')
  const [sending, setSending] = useState(false)

  const markedFlags = flags.filter((f) => f.markedForLegal)
  const markedCount = markedFlags.length
  const scrollable = flags.length > RED_FLAGS_MAX_VISIBLE
  const allMarked = flags.length > 0 && flags.every((f) => f.markedForLegal)
  const someMarked = flags.some((f) => f.markedForLegal)

  function toggleMark(flagId: string) {
    onFlagsChange(
      flags.map((f) => (f.id === flagId ? { ...f, markedForLegal: !f.markedForLegal } : f))
    )
  }

  function toggleAllMarked() {
    const next = !allMarked
    onFlagsChange(flags.map((f) => ({ ...f, markedForLegal: next })))
  }

  async function sendToLegal() {
    const email = legalEmail.trim()
    if (!isValidBidTeamEmail(email)) {
      toast.error('Bitte eine gültige E-Mail-Adresse für Legal eingeben.')
      return
    }
    if (markedCount === 0) {
      toast.error('Zuerst mindestens eine Red Flag zur Prüfung markieren.')
      return
    }

    setSending(true)
    const result = await sendDealDeskRedFlagsToLegalAction(projectId, {
      legalEmail: email,
      flags,
    })
    setSending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    setLegalSendOpen(false)
    toast.success(
      `${markedCount} Red Flag${markedCount === 1 ? '' : 's'} an ${email} gesendet` +
        (result.attachedCount > 0
          ? ` — ${result.attachedCount} Vertrags-/RFP-Dokument${result.attachedCount === 1 ? '' : 'e'} angehängt.`
          : ' (E-Mail ohne Dateianhang — Dokumente im Speicher prüfen).')
    )
  }

  const legalAction = (
    <Popover open={legalSendOpen} onOpenChange={setLegalSendOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5 text-xs"
          disabled={markedCount === 0 || sending}
        >
          {sending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="size-3.5" aria-hidden />
          )}
          An Legal senden
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-4" align="end">
        <p className="text-sm font-semibold text-foreground">An Legal senden</p>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          {markedCount === 0
            ? 'Keine markierten Punkte.'
            : `${markedCount} markierte Red Flag${markedCount === 1 ? '' : 's'}: E-Mail mit Klausel-Auszügen und den zugehörigen Vertrags-/Anhang-Dokumenten aus dem RFP-Paket.`}
        </p>
        <div className="mt-3 w-full space-y-2">
          <Label htmlFor="legal-contact-email" className="text-xs">
            Legal-Kontakt (E-Mail)
          </Label>
          <Input
            id="legal-contact-email"
            type="email"
            placeholder="legal@firma.de"
            value={legalEmail}
            onChange={(e) => setLegalEmail(e.target.value)}
            className="h-9 w-full text-xs"
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void sendToLegal()
              }
            }}
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="mt-3 w-full gap-1.5"
          disabled={sending}
          onClick={() => void sendToLegal()}
        >
          {sending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Wird gesendet…
            </>
          ) : (
            'Senden inkl. Dokumente'
          )}
        </Button>
      </PopoverContent>
    </Popover>
  )

  return (
    <BidOverviewCollapsibleCard
      defaultOpen={defaultOpen}
      className={cn('w-full', className)}
      contentClassName="pt-2 pb-6"
      headerActions={legalAction}
      title={
        <span className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span
            className="flex shrink-0 items-center"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              id="legal-flags-select-all"
              checked={allMarked ? true : someMarked ? 'indeterminate' : false}
              disabled={flags.length === 0}
              onCheckedChange={() => toggleAllMarked()}
              className="border-slate-300 data-[state=checked]:border-primary"
              aria-label="Alle Red Flags zur Legal-Prüfung markieren"
            />
          </span>
          <ShieldAlert className="size-4 shrink-0 text-amber-600" aria-hidden />
          Red Flags
          {flags.length > 0 ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
              {flags.length}
            </Badge>
          ) : null}
        </span>
      }
    >
      <div
        className={cn(
          'space-y-3',
          scrollable && 'max-h-[34rem] overflow-y-auto overscroll-contain pr-1'
        )}
      >
        {flags.map((flag) => {
          const styles = severityStyles(flag.severity)
          return (
            <div key={flag.id} className={cn('w-full overflow-hidden rounded-xl border', styles.border)}>
              <div className="flex items-start gap-3 px-5 py-4 sm:px-6">
                <Checkbox
                  id={`legal-flag-${flag.id}`}
                  checked={Boolean(flag.markedForLegal)}
                  onCheckedChange={() => toggleMark(flag.id)}
                  className="mt-1 shrink-0 border-slate-300 data-[state=checked]:border-primary"
                  aria-label={`${flag.title} zur Legal-Prüfung markieren`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn('text-[10px] font-semibold uppercase', styles.badge)}>
                      {flag.severity}
                    </Badge>
                    <span className="font-semibold text-foreground">{flag.title}</span>
                  </div>
                  {flag.pageHint || flag.sourceFileName ? (
                    <p className="mb-3 mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground/70">
                      <Paperclip className="size-3 shrink-0" aria-hidden />
                      {flag.sourceFileName ? (
                        <span>
                          {flag.sourceFileName}
                          {flag.pageHint ? (
                            <>
                              <span aria-hidden className="px-0.5 text-muted-foreground/50">
                                {' '}
                                ·{' '}
                              </span>
                              {flag.pageHint}
                            </>
                          ) : null}
                        </span>
                      ) : (
                        <span>{flag.pageHint}</span>
                      )}
                    </p>
                  ) : null}
                  <blockquote className="border-l-2 border-foreground/20 pl-3 text-sm italic leading-relaxed text-foreground/90">
                    {flag.excerpt}
                  </blockquote>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </BidOverviewCollapsibleCard>
  )
}

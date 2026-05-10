'use client'

import Link from 'next/link'
import { Mail } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5 shrink-0', className)} aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </svg>
  )
}

const DEFAULT_PREFILL =
  'Hallo RefStack-Team, ich habe eine Frage zu '

function buildWhatsAppHref(e164Digits: string): string {
  const text = encodeURIComponent(DEFAULT_PREFILL)
  return `https://wa.me/${e164Digits}?text=${text}`
}

export function SupportChannelsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const rawWa =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164?.trim() ?? '' : ''
  const waDigits = rawWa.replace(/\D/g, '')
  const whatsappHref = waDigits ? buildWhatsAppHref(waDigits) : ''

  const supportEmail =
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() : '') ||
    'support@refstack.ai'
  const mailtoSubject = encodeURIComponent('Support-Anfrage RefStack')
  const mailtoHref = `mailto:${supportEmail}?subject=${mailtoSubject}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight">Support</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Schnell Hilfe per Chat oder E-Mail — wie es dir passt.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 p-4">
          {whatsappHref ? (
            <Button
              variant="outline"
              className="h-auto justify-start gap-3 rounded-xl border-border/80 py-3.5 pl-3 pr-4 text-left font-normal shadow-sm hover:bg-muted/50"
              asChild
            >
              <Link href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366]">
                  <WhatsAppGlyph className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">Direkt per WhatsApp schreiben</span>
                  <span className="text-xs text-muted-foreground">Öffnet WhatsApp Web oder die App</span>
                </span>
              </Link>
            </Button>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
              WhatsApp-Link ist noch nicht konfiguriert. Bitte{' '}
              <code className="rounded bg-muted px-1 py-px text-[11px]">NEXT_PUBLIC_SUPPORT_WHATSAPP_E164</code>{' '}
              setzen (nur Ziffern, z.&nbsp;B. 49151…).
            </div>
          )}

          <Button
            variant="outline"
            className="h-auto justify-start gap-3 rounded-xl border-border/80 py-3.5 pl-3 pr-4 text-left font-normal shadow-sm hover:bg-muted/50"
            asChild
          >
            <Link href={mailtoHref}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="size-5" strokeWidth={2} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Support-Ticket per E-Mail</span>
                <span className="truncate text-xs text-muted-foreground">{supportEmail}</span>
              </span>
            </Link>
          </Button>

          <p className="px-0.5 pt-1 text-[11px] leading-relaxed text-muted-foreground">
            Ausführliches Feedback mit Kontext kannst du über „Feedback senden“ in der Sidebar einreichen — wir
            erhalten es ebenfalls per E-Mail.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, type ReactNode } from 'react'
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
import { SupportInAppForm } from '@/components/dashboard/support-in-app-form'
import { cn } from '@/lib/utils'

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-4 shrink-0', className)} aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </svg>
  )
}

const DEFAULT_PREFILL = 'Hallo RefStack-Team, ich habe eine Frage zu '

function buildWhatsAppHref(e164Digits: string): string {
  const text = encodeURIComponent(DEFAULT_PREFILL)
  return `https://wa.me/${e164Digits}?text=${text}`
}

function AlternativeChannelButton({
  href,
  external,
  icon,
  title,
  subtitle,
}: {
  href: string
  external?: boolean
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <Button
      variant="ghost"
      className="h-auto w-full justify-start gap-2.5 rounded-lg px-2 py-2 text-left font-normal hover:bg-muted/60"
      asChild
    >
      <Link
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {icon}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </span>
      </Link>
    </Button>
  )
}

export function SupportChannelsDialog({
  open,
  onOpenChange,
  defaultEmail = '',
  onFeedbackOpen,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultEmail?: string
  onFeedbackOpen?: () => void
}) {
  const [ticketSent, setTicketSent] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) setTicketSent(false)
    onOpenChange(next)
  }

  const rawWa =
    typeof process !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164?.trim() ?? '')
      : ''
  const waDigits = rawWa.replace(/\D/g, '')
  const whatsappHref = waDigits ? buildWhatsAppHref(waDigits) : ''

  const supportEmail =
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim()
      : '') || 'support@refstack.ai'
  const mailtoSubject = encodeURIComponent('Support-Anfrage RefStack')
  const mailtoHref = `mailto:${supportEmail}?subject=${mailtoSubject}`

  const showAlternatives = !ticketSent

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Support
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Bei Fragen oder Problemen mit RefStack. Wir melden uns innerhalb von 24h bei
            dir.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-4">
          <SupportInAppForm
            key={open ? 'open' : 'closed'}
            defaultEmail={defaultEmail}
            onCancel={() => onOpenChange(false)}
            onSent={() => setTicketSent(true)}
            showCancel={!ticketSent}
          />

          {showAlternatives ? (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">Oder direkt</span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                {whatsappHref ? (
                  <AlternativeChannelButton
                    href={whatsappHref}
                    external
                    icon={
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#25D366]/15 text-[#128C7E]">
                        <WhatsAppGlyph />
                      </span>
                    }
                    title="Kontakt zu unserem Gründer"
                    subtitle="Per WhatsApp — öffnet die App"
                  />
                ) : null}

                <AlternativeChannelButton
                  href={mailtoHref}
                  icon={
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Mail className="size-4" strokeWidth={2} />
                    </span>
                  }
                  title="E-Mail senden"
                  subtitle={`Öffnet dein E-Mail-Programm · ${supportEmail}`}
                />
              </div>

              {onFeedbackOpen ? (
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  Produktidee oder Bug?{' '}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={() => {
                      onOpenChange(false)
                      onFeedbackOpen()
                    }}
                  >
                    Feedback senden
                  </button>
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

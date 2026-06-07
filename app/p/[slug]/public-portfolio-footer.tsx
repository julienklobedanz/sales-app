'use client'

import { Suspense } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { PublicPortfolioKillswitch } from './killswitch'
import { Calendar, HelpCircleIcon, FileDownloadIcon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'

function SecurityPrivacyPopover({ workspaceName }: { workspaceName: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wider underline-offset-4 hover:underline"
        >
          Sicherheit & Datenschutz
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" side="top">
        <PopoverHeader>
          <PopoverTitle>Sicherheit & Datenschutz</PopoverTitle>
          <PopoverDescription className="text-xs leading-relaxed">
            Diese Seite zeigt ausschließlich für die Freigabe bestimmte Informationen. Es werden keine
            Tracking-Cookies für Werbezwecke gesetzt. Ansprechpartner und Inhalte stammen von{' '}
            <span className="font-medium text-foreground">{workspaceName}</span>. Für vertragliche oder
            datenschutzrechtliche Informationen wenden Sie sich bitte direkt an den genannten Anbieter oder
            nutzen Sie dessen Website bzw. Impressum.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}

export function PublicPortfolioFooter({
  slug,
  workspaceName,
  shareOwnerEmail,
  bookingUrl,
  canDeactivate,
  embedded = false,
}: {
  slug: string
  workspaceName: string
  shareOwnerEmail: string | null
  bookingUrl: string | null
  /** Nur true, wenn gültiges ?manage=-Geheimnis in der URL ist */
  canDeactivate: boolean
  /** Showcase: ohne Trennlinie, im gleichen Container wie die Inhalts-Cards */
  embedded?: boolean
}) {
  const questionSubject = encodeURIComponent('Frage zur Referenz')
  const questionHref =
    shareOwnerEmail && shareOwnerEmail.includes('@')
      ? `mailto:${shareOwnerEmail}?subject=${questionSubject}`
      : null

  const pdfHref = `/api/public-portfolio-pdf?slug=${encodeURIComponent(slug)}`

  const actionButtons = (
    <>
      <Button
        asChild={Boolean(questionHref)}
        className="rounded-lg"
        disabled={!questionHref}
        title={!questionHref ? 'Keine E-Mail des Ansprechpartners hinterlegt.' : undefined}
      >
        {questionHref ? (
          <a href={questionHref}>
            <AppIcon icon={HelpCircleIcon} size={16} />
            Frage stellen
          </a>
        ) : (
          <span className="inline-flex items-center gap-2">
            <AppIcon icon={HelpCircleIcon} size={16} />
            Frage stellen
          </span>
        )}
      </Button>
      <Button
        asChild={Boolean(bookingUrl)}
        className="rounded-lg"
        disabled={!bookingUrl}
        title={
          !bookingUrl
            ? 'Buchungslink kann im RefStack-Profil unter Einstellungen hinterlegt werden.'
            : undefined
        }
      >
        {bookingUrl ? (
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
            <AppIcon icon={Calendar} size={16} />
            Termin vereinbaren
          </a>
        ) : (
          <span className="inline-flex items-center gap-2">
            <AppIcon icon={Calendar} size={16} />
            Termin vereinbaren
          </span>
        )}
      </Button>
      <Button asChild variant="outline" className="rounded-lg">
        <a href={pdfHref} target="_blank" rel="noopener noreferrer">
          <AppIcon icon={FileDownloadIcon} size={16} />
          PDF
        </a>
      </Button>
    </>
  )

  if (embedded) {
    return (
      <footer className="mt-10 space-y-6">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {actionButtons}
        </div>
        <div className="flex justify-start">
          <SecurityPrivacyPopover workspaceName={workspaceName} />
        </div>
      </footer>
    )
  }

  return (
    <footer className="border-t bg-muted/30 px-4 py-8">
      <div className="relative mx-auto min-h-11 w-full max-w-7xl">
        <div className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
          <SecurityPrivacyPopover workspaceName={workspaceName} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {actionButtons}
        </div>

        {canDeactivate ? (
          <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 sm:block">
            <Suspense fallback={null}>
              <PublicPortfolioKillswitch slug={slug} />
            </Suspense>
          </div>
        ) : null}

        <div className="mt-4 flex justify-start sm:hidden">
          <SecurityPrivacyPopover workspaceName={workspaceName} />
        </div>
      </div>
    </footer>
  )
}

'use client'

import { Button } from '@/components/ui/button'
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

export function PublicPortfolioFooter({
  slug,
  workspaceName,
  shareOwnerEmail,
  bookingUrl,
}: {
  slug: string
  workspaceName: string
  shareOwnerEmail: string | null
  bookingUrl: string | null
}) {
  const questionSubject = encodeURIComponent('Frage zur Referenz')
  const questionHref =
    shareOwnerEmail && shareOwnerEmail.includes('@')
      ? `mailto:${shareOwnerEmail}?subject=${questionSubject}`
      : null

  const pdfHref = `/api/public-portfolio-pdf?slug=${encodeURIComponent(slug)}`

  return (
    <footer className="border-t bg-muted/30 px-6 py-8 sm:px-12 lg:px-24">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-4 sm:grid-cols-[auto_1fr_auto]">
        <div className="justify-self-start">
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
                  Diese Seite zeigt ausschließlich für die Freigabe bestimmte Informationen. Es werden
                  keine Tracking-Cookies für Werbezwecke gesetzt. Ansprechpartner und Inhalte stammen von{' '}
                  <span className="font-medium text-foreground">{workspaceName}</span>. Für
                  vertragliche oder datenschutzrechtliche Informationen wenden Sie sich bitte direkt an
                  den genannten Anbieter oder nutzen Sie dessen Website bzw. Impressum.
                </PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        </div>
        <div className="justify-self-center flex flex-wrap items-center justify-center gap-2 sm:gap-3">
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
        </div>
        <div className="justify-self-end">
          <PublicPortfolioKillswitch slug={slug} />
        </div>
      </div>
    </footer>
  )
}

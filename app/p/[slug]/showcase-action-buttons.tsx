'use client'

import { Button } from '@/components/ui/button'
import { Calendar, HelpCircleIcon, FileDownloadIcon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'

export function ShowcaseActionButtons({
  slug,
  shareOwnerEmail,
  bookingUrl,
}: {
  slug: string
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
    <div className="mt-6 flex flex-col gap-3">
      <Button
        asChild={Boolean(questionHref)}
        className="w-full rounded-lg"
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
        className="w-full rounded-lg"
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
      <Button asChild variant="outline" className="w-full rounded-lg">
        <a href={pdfHref} target="_blank" rel="noopener noreferrer">
          <AppIcon icon={FileDownloadIcon} size={16} />
          PDF
        </a>
      </Button>
    </div>
  )
}

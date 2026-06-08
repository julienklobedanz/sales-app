'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Calendar, HelpCircleIcon, FileDownloadIcon, Pencil } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

const APPROVAL_EDIT_BUTTON_CLASS =
  'w-full rounded-lg border-transparent bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus-visible:ring-amber-500/40'

export function ShowcaseActionButtons({
  slug,
  shareOwnerEmail,
  bookingUrl,
  approvalEditUrl,
  showApprovalEdit,
}: {
  slug: string
  shareOwnerEmail: string | null
  bookingUrl: string | null
  approvalEditUrl?: string | null
  showApprovalEdit?: boolean
}) {
  const questionSubject = encodeURIComponent('Frage zur Referenz')
  const questionHref =
    shareOwnerEmail && shareOwnerEmail.includes('@')
      ? `mailto:${shareOwnerEmail}?subject=${questionSubject}`
      : null

  const pdfHref = `/api/public-portfolio-pdf?slug=${encodeURIComponent(slug)}`

  return (
    <div className="mt-6 flex flex-col gap-3">
      {showApprovalEdit && approvalEditUrl ? (
        <Button asChild className={cn(APPROVAL_EDIT_BUTTON_CLASS)}>
          <Link href={approvalEditUrl}>
            <AppIcon icon={Pencil} size={16} />
            Meine Freigabe bearbeiten
          </Link>
        </Button>
      ) : null}
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

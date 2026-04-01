'use client'

import Image from 'next/image'
import { Building2 } from '@hugeicons/core-free-icons'
import type { ReferenceRow } from './actions'
import { AppIcon } from '@/lib/icons'

export function ReferenceReader({ reference }: { reference: ReferenceRow }) {
  const isAnonymized = reference.status === 'anonymized'
  const companyDisplay = isAnonymized ? 'Anonymisierter Kunde' : reference.company_name

  return (
    <article className="mx-auto w-full max-w-4xl flex flex-col gap-8 rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">
      {/* Logo – klein, dezent oben */}
      <div className="flex justify-center">
        {isAnonymized ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 bg-muted/50">
            <AppIcon icon={Building2} size={24} className="text-muted-foreground" />
          </div>
        ) : reference.company_logo_url ? (
          <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-border bg-muted">
            <Image
              src={reference.company_logo_url}
              alt=""
              fill
              className="object-contain p-1"
              sizes="48px"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/50">
            <AppIcon icon={Building2} size={24} className="text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Firma (oder anonymisiert) */}
      <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {companyDisplay}
      </p>

      {/* Titel – zentriert, prominent */}
      <h2 className="break-words text-center text-xl font-semibold leading-tight tracking-tight text-foreground md:text-2xl">
        {reference.title}
      </h2>

      {/* Zusammenfassung */}
      {reference.summary && (
        <div className="w-full rounded-xl border border-border bg-background p-5 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {reference.summary}
          </p>
        </div>
      )}

      {/* Story – neutral, enterprise-ready */}
      <div className="w-full space-y-0 rounded-2xl border border-border bg-background p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Herausforderung des Kunden
          </p>
          <p className="text-foreground text-sm leading-relaxed">
            {reference.customer_challenge || '—'}
          </p>
        </div>
        <div className="mt-6 border-t border-border" />
        <div className="mt-6 space-y-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Unsere Lösung
          </p>
          <p className="text-foreground text-sm leading-relaxed">
            {reference.our_solution || '—'}
          </p>
        </div>
      </div>

      {/* Optionale Tags – dezent */}
      {reference.tags && reference.tags.trim() && (
        <div className="flex flex-wrap justify-center gap-2">
          {reference.tags
            .split(/[\s,]+/)
            .map((t) => t.trim())
            .filter(Boolean)
            .map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
        </div>
      )}
    </article>
  )
}

'use client'

import Image from 'next/image'
import { Building2Icon } from 'lucide-react'
import type { ReferenceRow } from './actions'

export function ReferenceReader({ ref: refData }: { ref: ReferenceRow }) {
  const isAnonymized = refData.status === 'anonymized'
  const companyDisplay = isAnonymized ? 'Anonymisierter Kunde' : refData.company_name

  return (
    <article className="mx-auto flex max-w-2xl flex-col items-center gap-8 rounded-2xl border bg-card/80 p-8 shadow-sm md:p-12">
      {/* Logo – groß, zentriert */}
      <div className="flex justify-center">
        {isAnonymized ? (
          <div className="flex size-24 items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 bg-muted/50 md:size-28">
            <Building2Icon className="size-12 text-muted-foreground md:size-14" />
          </div>
        ) : refData.company_logo_url ? (
          <div className="relative size-24 overflow-hidden rounded-xl border bg-muted md:size-28">
            <Image
              src={refData.company_logo_url}
              alt=""
              fill
              className="object-contain"
              sizes="112px"
            />
          </div>
        ) : (
          <div className="flex size-24 items-center justify-center rounded-xl border bg-muted/50 md:size-28">
            <Building2Icon className="size-10 text-muted-foreground md:size-12" />
          </div>
        )}
      </div>

      {/* Firma (oder anonymisiert) */}
      <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {companyDisplay}
      </p>

      {/* Titel – zentriert, prominent */}
      <h2 className="text-center text-xl font-semibold leading-tight tracking-tight text-foreground md:text-2xl">
        {refData.title}
      </h2>

      {/* Zusammenfassung */}
      {refData.summary && (
        <div className="w-full rounded-xl border bg-muted/30 p-5 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {refData.summary}
          </p>
        </div>
      )}

      {/* Story-Boxen – Kern des Projekts, prominent */}
      <div className="w-full space-y-6 rounded-2xl border-2 border-amber-200/70 bg-amber-50/60 p-6 dark:border-amber-800/50 dark:bg-amber-950/40">
        <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Storytelling – Kern des Projekts
        </h3>
        {refData.customer_challenge ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Herausforderung des Kunden
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {refData.customer_challenge}
            </p>
          </div>
        ) : (
          <p className="text-center text-sm italic text-muted-foreground">
            Keine Herausforderung hinterlegt.
          </p>
        )}
        {refData.our_solution ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Unsere Lösung
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {refData.our_solution}
            </p>
          </div>
        ) : (
          <p className="text-center text-sm italic text-muted-foreground">
            Keine Lösung hinterlegt.
          </p>
        )}
      </div>

      {/* Optionale Tags – dezent */}
      {refData.tags && refData.tags.trim() && (
        <div className="flex flex-wrap justify-center gap-2">
          {refData.tags
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

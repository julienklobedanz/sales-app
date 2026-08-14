'use client'

import { Building2, InformationCircleIcon, Sparkles } from '@hugeicons/core-free-icons'
import type { ReferenceRow } from './actions'
import { AppIcon } from '@/lib/icons'
import { CompanyLogo } from '@/components/ui/company-logo'

export function ReferenceReader({ reference }: { reference: ReferenceRow }) {
  const isAnonymized = reference.status === 'anonymized'
  const companyDisplay = isAnonymized ? 'Anonymisierter Kunde' : reference.company_name

  const tags = String(reference.tags ?? '')
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6)

  return (
    <article className="w-full rounded-2xl border border-border bg-white p-6 text-foreground shadow-sm">
      <div className="flex items-start gap-3">
        {isAnonymized ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 bg-muted/50">
            <AppIcon icon={Building2} size={24} className="text-muted-foreground" />
          </div>
        ) : (
          <CompanyLogo
            src={reference.company_logo_url}
            companyId={reference.company_id}
            fallbackText={reference.company_name}
            containerClassName="h-12 w-12 rounded-xl"
            fallbackIconSize={24}
          />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {companyDisplay}
          </p>
          <h2 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-foreground md:text-2xl">
            {reference.title}
          </h2>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <AppIcon icon={InformationCircleIcon} size={14} />
            Herausforderung
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {reference.customer_challenge || '—'}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <AppIcon icon={Sparkles} size={14} />
            Unsere Lösung
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {reference.our_solution || '—'}
          </p>
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

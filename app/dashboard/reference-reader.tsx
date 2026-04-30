'use client'

import Image from 'next/image'
import { Building2, InformationCircleIcon, Sparkles } from '@hugeicons/core-free-icons'
import type { ReferenceRow } from './actions'
import { AppIcon } from '@/lib/icons'

export function ReferenceReader({ reference }: { reference: ReferenceRow }) {
  const isAnonymized = reference.status === 'anonymized'
  const companyDisplay = isAnonymized ? 'Anonymisierter Kunde' : reference.company_name

  const tags = String(reference.tags ?? '')
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6)

  return (
    <article className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
      <div className="flex items-start gap-3">
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
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{companyDisplay}</p>
          <h2 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-slate-900 md:text-2xl">
            {reference.title}
          </h2>
        </div>
      </div>

      {reference.summary && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm leading-relaxed text-slate-700">
            {reference.summary}
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <AppIcon icon={InformationCircleIcon} size={14} />
            Herausforderung
          </p>
          <p className="text-sm leading-relaxed text-slate-800">{reference.customer_challenge || '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <AppIcon icon={Sparkles} size={14} />
            Unsere Lösung
          </p>
          <p className="text-sm leading-relaxed text-slate-800">{reference.our_solution || '—'}</p>
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

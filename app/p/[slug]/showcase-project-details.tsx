import type { ReactNode } from 'react'

import { formatContractTypeDisplay } from '@/lib/references/contract-type'
import { formatProjectStatusDe } from '@/lib/public-portfolio/kpis-for-reference'
import type { PublicReference } from '../actions'
import { ShowcaseActionButtons } from './showcase-action-buttons'

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function formatEmployees(count: number | null): string {
  if (count == null) return '—'
  return count.toLocaleString('de-DE')
}

function websiteHref(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function websiteLabel(raw: string): string {
  const trimmed = raw.trim()
  try {
    const url = new URL(websiteHref(trimmed))
    return url.hostname.replace(/^www\./, '')
  } catch {
    return trimmed
  }
}

export function ShowcaseProjectDetails({
  reference,
  slug,
  shareOwnerEmail,
  bookingUrl,
}: {
  reference: PublicReference
  slug: string
  shareOwnerEmail: string | null
  bookingUrl: string | null
}) {
  const contractType = formatContractTypeDisplay(reference.contract_type) || '—'
  const projectStatus =
    formatProjectStatusDe(reference.project_status) || reference.project_status?.trim() || '—'
  const incumbent = reference.incumbent_provider?.trim() || '—'
  const competitors = reference.competitors?.trim() || '—'
  const employees = formatEmployees(reference.employee_count)
  const websiteRaw = reference.website?.trim()

  return (
    <aside className="lg:col-span-4">
      <div className="sticky top-32 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Projektdetails</h3>

        <div>
          <DetailRow label="Vertragsart" value={contractType} />
          <DetailRow label="Projektstatus" value={projectStatus} />
          <DetailRow label="Dienstleister" value={incumbent} />
          <DetailRow label="Wettbewerber" value={competitors} />
          <DetailRow label="Mitarbeiter" value={employees} />
          <DetailRow
            label="Website"
            value={
              websiteRaw ? (
                <a
                  href={websiteHref(websiteRaw)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {websiteLabel(websiteRaw)}
                </a>
              ) : (
                '—'
              )
            }
          />
        </div>

        <ShowcaseActionButtons
          slug={slug}
          shareOwnerEmail={shareOwnerEmail}
          bookingUrl={bookingUrl}
        />
      </div>
    </aside>
  )
}

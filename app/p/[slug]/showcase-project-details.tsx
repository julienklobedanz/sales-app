import type { ReactNode } from 'react'

import { formatContractTypeDisplay } from '@/lib/references/contract-type'
import { formatProjectStatusDe } from '@/lib/public-portfolio/kpis-for-reference'
import { showcaseFieldDisplay } from '@/lib/public-portfolio/showcase-field-display'
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

function formatEmployees(count: number | null): string | null {
  if (count == null) return null
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

function detailValue(
  raw: string | null | undefined,
  manageMode: boolean,
  websiteNode?: ReactNode
): { show: boolean; value: ReactNode } {
  if (websiteNode) {
    return { show: true, value: websiteNode }
  }
  return showcaseFieldDisplay(raw, manageMode)
}

export function ShowcaseProjectDetails({
  reference,
  slug,
  shareOwnerEmail,
  bookingUrl,
  approvalEditUrl,
  showApprovalEdit,
  manageMode = false,
}: {
  reference: PublicReference
  slug: string
  shareOwnerEmail: string | null
  bookingUrl: string | null
  approvalEditUrl?: string | null
  showApprovalEdit?: boolean
  manageMode?: boolean
}) {
  const contractType = formatContractTypeDisplay(reference.contract_type) || null
  const projectStatus =
    formatProjectStatusDe(reference.project_status) || reference.project_status?.trim() || null
  const incumbent = reference.incumbent_provider?.trim() || null
  const competitors = reference.competitors?.trim() || null
  const employees = formatEmployees(reference.employee_count)
  const websiteRaw = reference.website?.trim()

  const rows: Array<{ label: string; show: boolean; value: ReactNode }> = [
    (() => {
      const d = detailValue(contractType, manageMode)
      return { label: 'Vertragsart', ...d }
    })(),
    (() => {
      const d = detailValue(projectStatus, manageMode)
      return { label: 'Projektstatus', ...d }
    })(),
    (() => {
      const d = detailValue(incumbent, manageMode)
      return { label: 'Dienstleister', ...d }
    })(),
    (() => {
      const d = detailValue(competitors, manageMode)
      return { label: 'Wettbewerber', ...d }
    })(),
    (() => {
      const d = detailValue(employees, manageMode)
      return { label: 'Mitarbeiter', ...d }
    })(),
    (() => {
      if (websiteRaw) {
        return {
          label: 'Website',
          show: true,
          value: (
            <a
              href={websiteHref(websiteRaw)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {websiteLabel(websiteRaw)}
            </a>
          ),
        }
      }
      const d = detailValue(null, manageMode)
      return { label: 'Website', ...d }
    })(),
  ]

  return (
    <aside className="min-w-0">
      <div className="sticky top-32 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Projektdetails</h3>

        <div>
          {rows
            .filter((r) => r.show)
            .map((r) => (
              <DetailRow key={r.label} label={r.label} value={r.value} />
            ))}
        </div>

        <ShowcaseActionButtons
          slug={slug}
          shareOwnerEmail={shareOwnerEmail}
          bookingUrl={bookingUrl}
          approvalEditUrl={approvalEditUrl}
          showApprovalEdit={showApprovalEdit}
          manageMode={manageMode}
        />
      </div>
    </aside>
  )
}

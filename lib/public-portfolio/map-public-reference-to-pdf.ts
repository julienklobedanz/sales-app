import type { PdfReference } from '@/lib/references/library/pdf/types'
import type { PublicReference } from '@/app/p/actions'
import { computeReferenceDurationMonths } from '@/lib/references/reference-duration-months'

export function mapPublicReferenceToPdfReference(ref: PublicReference): PdfReference {
  return {
    id: ref.id,
    title: ref.title,
    summary: ref.summary ?? null,
    industry: ref.industry ?? null,
    country: ref.country ?? null,
    status: ref.status,
    tags: ref.tags ?? null,
    company_name: ref.company_name || '—',
    company_logo_url: ref.company_logo_url ?? null,
    website: ref.website ?? null,
    employee_count: ref.employee_count ?? null,
    volume_eur: ref.volume_eur ?? null,
    contract_type: ref.contract_type ?? null,
    incumbent_provider: ref.incumbent_provider ?? null,
    competitors: ref.competitors ?? null,
    customer_challenge: ref.customer_challenge ?? null,
    our_solution: ref.our_solution ?? null,
    customer_contact: null,
    project_status: ref.project_status ?? null,
    project_start: ref.project_start ?? null,
    project_end: ref.project_end ?? null,
    duration_months:
      ref.duration_months ??
      computeReferenceDurationMonths({
        project_start: ref.project_start ?? null,
        project_end: ref.project_end ?? null,
        project_status: ref.project_status ?? null,
      }),
    approval_quote_approved: ref.approval_quote_approved ?? null,
    approval_reference_giver_name: ref.approval_reference_giver_name ?? null,
    approval_reference_giver_title: null,
  }
}

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { accountFromJoin } from '@/lib/accounts/account-from-join'
import { buildReferencePrefillFromAnalysis } from '@/lib/deal-desk/build-harvest-from-snapshot'
import type { DealDeskMockAnalysis } from '@/lib/deal-desk/mock-analysis'
import { ReferenceForm } from '../../new/reference-form'
import type { ReferenceFormInitialData } from '../../new/reference-form'
import {
  DASHBOARD_PAGE_SUBTITLE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from '@/lib/dashboard-ui'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { userCanEditReference } from '@/lib/roles/reference-access'

export const maxDuration = 180

export default async function EditReferencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ fromDesk?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const fromDeskId = typeof sp.fromDesk === 'string' ? sp.fromDesk.trim() : ''
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: me } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role, capabilities')
    .eq('id', user.id)
    .single()
  if (!me) redirect(ROUTES.onboarding)
  const roles = parseProfileRoles(me)
  if (
    !fromDeskId &&
    !userCanEditReference(roles.functionRole, roles.systemRole, roles.capabilities)
  ) {
    redirect(ROUTES.references.detail(id))
  }

  // 1. Referenz laden (mit contact_id)
  const { data: row, error } = await supabase
    .from('references')
    .select(
      `
      id,
      company_id,
      title,
      summary,
      industry,
      country,
      website,
      employee_count,
      volume_eur,
      contract_type,
      incumbent_provider,
      competitors,
      customer_challenge,
      our_solution,
      contact_id,
      customer_contact_id,
      customer_contact,
      status,
      is_nda_deal,
      file_path,
      tags,
      project_status,
      project_start,
      project_end,
      created_by,
      companies ( name )
    `,
    )
    .eq('id', id)
    .single()

  if (error || !row) {
    notFound()
  }

  // Ownership-Gating: AM darf nur eigene Referenzen bearbeiten, Admin alle.
  if (roles.functionRole === 'account_manager') {
    if (!row.created_by || row.created_by !== user.id) {
      redirect(ROUTES.references.detail(id))
    }
  }

  // 2. Optionen für Dropdowns laden
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, logo_url')
    .order('name')
  const { data: contacts } = await supabase
    .from('contact_persons')
    .select('*')
    .order('last_name')
  const { data: externalContacts } = await supabase
    .from('external_contacts')
    .select('id, company_id, first_name, last_name, email, role, phone')
    .eq('organization_id', me.organization_id ?? '')
    .order('last_name')

  const company_name = accountFromJoin(row.companies)?.name ?? ''

  const companyLogoUrl =
    companies?.find((c: { id: string }) => c.id === row.company_id)?.logo_url ?? null
  const initialData: ReferenceFormInitialData = {
    id: row.id,
    company_id: row.company_id,
    company_name,
    company_logo_url: companyLogoUrl,
    title: row.title,
    summary: row.summary ?? null,
    industry: row.industry ?? null,
    country: row.country ?? null,
    website: row.website ?? null,
    employee_count: row.employee_count ?? null,
    volume_eur: row.volume_eur ?? null,
    contract_type: row.contract_type ?? null,
    incumbent_provider: row.incumbent_provider ?? null,
    competitors: row.competitors ?? null,
    customer_challenge: row.customer_challenge ?? null,
    our_solution: row.our_solution ?? null,
    customer_contact: row.customer_contact ?? null,
    customer_contact_id: row.customer_contact_id ?? null,
    contact_id: row.contact_id ?? null,
    status: row.status as ReferenceFormInitialData['status'],
    is_nda_deal: (row.is_nda_deal as boolean | undefined) ?? false,
    file_path: row.file_path ?? null,
    tags: row.tags ?? null,
    project_status: (row.project_status as 'active' | 'completed' | null) ?? null,
    project_start: row.project_start ?? null,
    project_end: row.project_end ?? null,
  }

  if (fromDeskId && me.organization_id) {
    const { data: deskRow } = await supabase
      .from('deal_desk_projects')
      .select('project_name, analysis_snapshot')
      .eq('id', fromDeskId)
      .eq('organization_id', me.organization_id)
      .maybeSingle()

    if (deskRow?.analysis_snapshot && typeof deskRow.analysis_snapshot === 'object') {
      const deskAnalysis = deskRow.analysis_snapshot as DealDeskMockAnalysis
      const deskPrefill = buildReferencePrefillFromAnalysis(
        deskAnalysis,
        (deskRow.project_name as string) || 'Deal Desk',
      )
      initialData.customer_challenge =
        initialData.customer_challenge?.trim() || deskPrefill.customer_challenge
      initialData.our_solution =
        initialData.our_solution?.trim() || deskPrefill.our_solution
      initialData.summary = initialData.summary?.trim() || deskPrefill.summary
      initialData.industry = initialData.industry?.trim() || deskPrefill.industry
      if (!initialData.title?.trim() || initialData.title.includes('Deal Desk')) {
        initialData.title = deskPrefill.title
      }
    }
  }

  return (
    <div className="min-h-screen bg-muted/10 p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href={ROUTES.references.detail(id)}>
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <AppIcon icon={ArrowLeftIcon} size={16} />
            Zurück zur Referenz
          </Button>
        </Link>
        <div className="space-y-1">
          <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Referenz bearbeiten</h1>
          <p className={DASHBOARD_PAGE_SUBTITLE_CLASS}>
            {fromDeskId
              ? 'Felder aus dem Deal Desk (RFP-Analyse) — bitte prüfen und speichern.'
              : 'Prüfe die Felder und speichere deine Änderungen.'}
          </p>
        </div>
        {fromDeskId ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
            <p className="font-medium">Nächster Schritt: Freigabe</p>
            <p className="mt-1 text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed">
              Nach dem Speichern startest du den Freigabeprozess ausschließlich in der
              Referenz-Detailansicht unter <strong>Freigabestatus</strong> („Freigabe
              anfordern“).
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 bg-background">
              <Link href={ROUTES.references.detail(id)}>Zur Detailansicht</Link>
            </Button>
          </div>
        ) : null}
        <ReferenceForm
          companies={companies ?? []}
          contacts={contacts ?? []}
          externalContacts={externalContacts ?? []}
          initialData={initialData}
        />
      </div>
    </div>
  )
}

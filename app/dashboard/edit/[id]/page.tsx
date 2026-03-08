import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from 'lucide-react'
import { ReferenceForm } from '../../new/reference-form'
import type { ReferenceFormInitialData } from '../../new/reference-form'

export default async function EditReferencePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Referenz laden (mit contact_id)
  const { data: row, error } = await supabase
    .from('references')
    .select(`
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
      companies ( name )
    `)
    .eq('id', id)
    .single()

  if (error || !row) {
    notFound()
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
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .single()
  const { data: externalContacts } = await supabase
    .from('external_contacts')
    .select('id, company_id, first_name, last_name, email, role, phone')
    .eq('organization_id', profile?.organization_id ?? '')
    .order('last_name')

  const company =
    Array.isArray(row.companies) && row.companies.length > 0
      ? (row.companies[0] as { name?: string })
      : (row.companies as { name?: string } | null)
  const company_name = company?.name ?? ''

  const companyLogoUrl = companies?.find((c: { id: string }) => c.id === row.company_id)?.logo_url ?? null
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="-ml-2 gap-2">
            <ArrowLeftIcon className="size-4" />
            Zurück zum Dashboard
          </Button>
        </Link>
        <div className="flex flex-col gap-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Referenz bearbeiten
          </h1>
          <ReferenceForm
            companies={companies ?? []}
            contacts={contacts ?? []}
            externalContacts={externalContacts ?? []}
            initialData={initialData}
          />
        </div>
      </div>
    </div>
  )
}

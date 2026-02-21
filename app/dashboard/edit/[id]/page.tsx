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
      contact_id,
      status,
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
    .select('id, name')
    .order('name')
  const { data: contacts } = await supabase
    .from('contact_persons')
    .select('*')
    .order('last_name')

  const company =
    Array.isArray(row.companies) && row.companies.length > 0
      ? (row.companies[0] as { name?: string })
      : (row.companies as { name?: string } | null)
  const company_name = company?.name ?? ''

  const initialData: ReferenceFormInitialData = {
    id: row.id,
    company_id: row.company_id,
    company_name,
    title: row.title,
    summary: row.summary ?? null,
    industry: row.industry ?? null,
    country: row.country ?? null,
    contact_id: row.contact_id ?? null,
    status: row.status as ReferenceFormInitialData['status'],
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
            initialData={initialData}
          />
        </div>
      </div>
    </div>
  )
}

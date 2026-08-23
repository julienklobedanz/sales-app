import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/db-types'
import { projectYearFromDates } from '@/lib/references/project-year'
import type { CompanyRefRow } from './account-action-types'

function toCompanyRefRow(
  row: Pick<
    Tables<'references'>,
    | 'id'
    | 'title'
    | 'status'
    | 'project_status'
    | 'industry'
    | 'country'
    | 'created_at'
    | 'summary'
    | 'project_start'
    | 'project_end'
  >,
): CompanyRefRow {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    project_status: row.project_status,
    industry: row.industry,
    country: row.country,
    created_at: row.created_at ?? '',
    summary: row.summary,
    project_start: row.project_start,
    project_end: row.project_end,
    project_year: projectYearFromDates(row.project_end, row.project_start),
  }
}

export async function getReferencesByCompanyIdImpl(
  companyId: string,
): Promise<CompanyRefRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('references')
    .select(
      'id, title, status, project_status, industry, country, created_at, summary, project_start, project_end',
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return (data ?? []).map(toCompanyRefRow)
}

'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type ReferenceRow = {
  id: string
  title: string
  summary: string | null
  industry: string | null
  country: string | null
  status: 'draft' | 'pending' | 'approved'
  created_at: string
  company_id: string
  company_name: string
  website?: string | null
  contact_person?: string | null
}

export type GetDashboardDataResult = {
  references: ReferenceRow[]
  totalCount: number
}

export async function getDashboardData(): Promise<GetDashboardDataResult> {
  const supabase = await createServerSupabaseClient()

  const { data: rows, error } = await supabase
    .from('references')
    .select(
      `
      id,
      title,
      summary,
      industry,
      country,
      status,
      created_at,
      company_id,
      companies (
        name
      )
    `
    )
    .order('created_at', { ascending: false })

  if (error) {
    return { references: [], totalCount: 0 }
  }

  const references: ReferenceRow[] = (rows ?? []).map((r) => {
    const raw = r.companies
    const company =
      Array.isArray(raw) && raw.length > 0
        ? (raw[0] as { name?: string })
        : (raw as { name?: string } | null)
    return {
      id: r.id,
      title: r.title,
      summary: r.summary ?? null,
      industry: r.industry ?? null,
      country: r.country ?? null,
      status: r.status as ReferenceRow['status'],
      created_at: r.created_at,
      company_id: r.company_id,
      company_name: company?.name ?? '—',
    }
  })

  return {
    references,
    totalCount: references.length,
  }
}

export async function deleteReference(id: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('references')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard')
}

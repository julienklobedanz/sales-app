'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type CompanyStrategyRow = {
  id: string
  company_id: string
  company_goals: string | null
  red_flags: string | null
  competition: string | null
  next_steps: string | null
  updated_at: string | null
}

export type StakeholderRole =
  | 'economic_buyer'
  | 'champion'
  | 'blocker'
  | 'technical_buyer'
  | 'user_buyer'

export type StakeholderRow = {
  id: string
  company_id: string
  name: string
  title: string | null
  role: StakeholderRole
  created_at: string
  updated_at: string | null
}

export type CompanyRefRow = {
  id: string
  title: string
  status: string
  project_status: string | null
  created_at: string
}

export async function getCompanyStrategy(
  companyId: string
): Promise<CompanyStrategyRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('company_strategies')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()
  return data as CompanyStrategyRow | null
}

export async function upsertCompanyStrategy(
  companyId: string,
  payload: {
    company_goals?: string | null
    red_flags?: string | null
    competition?: string | null
    next_steps?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('company_strategies').upsert(
    {
      company_id: companyId,
      company_goals: payload.company_goals ?? null,
      red_flags: payload.red_flags ?? null,
      competition: payload.competition ?? null,
      next_steps: payload.next_steps ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id' }
  )
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/companies')
  revalidatePath(`/dashboard/companies/${companyId}`)
  return { success: true }
}

export async function getStakeholders(companyId: string): Promise<StakeholderRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('stakeholders')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
  return (data ?? []) as StakeholderRow[]
}

export async function createStakeholder(
  companyId: string,
  payload: { name: string; title?: string | null; role: StakeholderRole }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('stakeholders').insert({
    company_id: companyId,
    name: payload.name.trim(),
    title: payload.title?.trim() || null,
    role: payload.role,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(`/dashboard/companies/${companyId}`)
  return { success: true }
}

export async function updateStakeholder(
  id: string,
  payload: { name?: string; title?: string | null; role?: StakeholderRole }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('stakeholders')
    .select('company_id')
    .eq('id', id)
    .single()
  const { error } = await supabase
    .from('stakeholders')
    .update({
      ...(payload.name !== undefined && { name: payload.name.trim() }),
      ...(payload.title !== undefined && { title: payload.title?.trim() || null }),
      ...(payload.role !== undefined && { role: payload.role }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(`/dashboard/companies/${row.company_id}`)
  return { success: true }
}

export async function deleteStakeholder(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('stakeholders')
    .select('company_id')
    .eq('id', id)
    .single()
  const { error } = await supabase.from('stakeholders').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(`/dashboard/companies/${row.company_id}`)
  return { success: true }
}

export async function getReferencesByCompanyId(
  companyId: string
): Promise<CompanyRefRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('references')
    .select('id, title, status, project_status, created_at')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return (data ?? []) as CompanyRefRow[]
}

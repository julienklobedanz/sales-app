import { revalidatePath } from 'next/cache'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { asTableUpdate, type Tables } from '@/lib/supabase/db-types'
import { parseStakeholderRole } from '@/lib/accounts/stakeholder-role'
import type { StakeholderRole, StakeholderRow } from './account-action-types'

function toStakeholderRow(row: Tables<'stakeholders'>): StakeholderRow {
  return {
    id: row.id,
    company_id: row.company_id ?? '',
    name: row.name,
    title: row.title,
    role: parseStakeholderRole(row.role),
    influence_level: row.influence_level,
    attitude: row.attitude,
    notes: row.notes,
    linkedin_url: row.linkedin_url,
    priorities_topics: row.priorities_topics,
    last_contact_at: row.last_contact_at,
    last_interaction_at: row.last_interaction_at,
    sentiment: row.sentiment,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at,
  }
}

export async function getStakeholdersImpl(companyId: string): Promise<StakeholderRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('stakeholders')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
  return (data ?? []).map(toStakeholderRow)
}

export async function createStakeholderImpl(
  companyId: string,
  payload: {
    name: string
    title?: string | null
    role: StakeholderRole
    influence_level?: string | null
    attitude?: string | null
    notes?: string | null
    linkedin_url?: string | null
    priorities_topics?: string | null
    last_contact_at?: string | null
    last_interaction_at?: string | null
    sentiment?: string | null
  },
): Promise<{ success: boolean; stakeholder?: StakeholderRow; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('stakeholders')
    .insert({
      company_id: companyId,
      name: payload.name.trim(),
      title: payload.title?.trim() || null,
      role: payload.role,
      influence_level: payload.influence_level?.trim() || null,
      attitude: payload.attitude?.trim() || null,
      notes: payload.notes?.trim() || null,
      linkedin_url: payload.linkedin_url?.trim() || null,
      priorities_topics: payload.priorities_topics?.trim() || null,
      last_contact_at: payload.last_contact_at || null,
      last_interaction_at: payload.last_interaction_at || payload.last_contact_at || null,
      sentiment: payload.sentiment?.trim() || null,
    })
    .select('*')
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true, stakeholder: data ? toStakeholderRow(data) : undefined }
}

export async function updateStakeholderImpl(
  id: string,
  payload: {
    name?: string
    title?: string | null
    role?: StakeholderRole
    influence_level?: string | null
    attitude?: string | null
    notes?: string | null
    linkedin_url?: string | null
    priorities_topics?: string | null
    last_contact_at?: string | null
    last_interaction_at?: string | null
    sentiment?: string | null
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('stakeholders')
    .select('company_id')
    .eq('id', id)
    .single()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (payload.name !== undefined) update.name = payload.name.trim()
  if (payload.title !== undefined) update.title = payload.title?.trim() || null
  if (payload.role !== undefined) update.role = payload.role
  if (payload.influence_level !== undefined)
    update.influence_level = payload.influence_level?.trim() || null
  if (payload.attitude !== undefined) update.attitude = payload.attitude?.trim() || null
  if (payload.notes !== undefined) update.notes = payload.notes?.trim() || null
  if (payload.linkedin_url !== undefined)
    update.linkedin_url = payload.linkedin_url?.trim() || null
  if (payload.priorities_topics !== undefined)
    update.priorities_topics = payload.priorities_topics?.trim() || null
  if (payload.last_contact_at !== undefined)
    update.last_contact_at = payload.last_contact_at || null
  if (payload.last_interaction_at !== undefined)
    update.last_interaction_at = payload.last_interaction_at || null
  if (payload.sentiment !== undefined)
    update.sentiment = payload.sentiment?.trim() || null
  const { error } = await supabase
    .from('stakeholders')
    .update(asTableUpdate<'stakeholders'>(update))
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(ROUTES.accountsDetail(row.company_id))
  return { success: true }
}

export async function deleteStakeholderImpl(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('stakeholders')
    .select('company_id')
    .eq('id', id)
    .single()
  const { error } = await supabase.from('stakeholders').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(ROUTES.accountsDetail(row.company_id))
  return { success: true }
}

import { revalidatePath } from 'next/cache'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { asJson, asTableInsert } from '@/lib/supabase/db-types'
import type { Json } from '@/lib/database.types'
import type { CompanyStrategyRow, RoadmapProjectRow } from './account-action-types'

function mhAssessmentFromJson(value: Json | null | undefined): Record<string, unknown> | null {
  if (value == null) return null
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function toCompanyStrategyRow(row: {
  id: string
  company_id: string | null
  company_goals: string | null
  red_flags: string | null
  competition: string | null
  next_steps: string | null
  value_proposition?: string | null
  metrics_pain?: string | null
  mh_assessment?: Json | null
  updated_at: string | null
}): CompanyStrategyRow {
  return {
    id: row.id,
    company_id: row.company_id ?? '',
    company_goals: row.company_goals,
    red_flags: row.red_flags,
    competition: row.competition,
    next_steps: row.next_steps,
    value_proposition: row.value_proposition ?? null,
    metrics_pain: row.metrics_pain ?? null,
    mh_assessment: mhAssessmentFromJson(row.mh_assessment),
    updated_at: row.updated_at,
  }
}

export async function getCompanyStrategyImpl(
  companyId: string,
): Promise<CompanyStrategyRow | null> {
  const supabase = await createServerSupabaseClient()
  const full = await supabase
    .from('company_strategies')
    // DB-Spalten: main_goals, competitive_situation; wir mappen per Alias auf unsere Feldnamen
    .select(
      'id, company_id, company_goals:main_goals, red_flags, competition:competitive_situation, next_steps, value_proposition, metrics_pain, mh_assessment, updated_at',
    )
    .eq('company_id', companyId)
    .maybeSingle()
  if (!full.error && full.data) return toCompanyStrategyRow(full.data)
  if (!full.error) return null

  const msg = (full.error.message ?? '').toLowerCase()
  const missingOptionalColumns =
    msg.includes('metrics_pain') ||
    msg.includes('mh_assessment') ||
    msg.includes('value_proposition')
  if (!missingOptionalColumns) return null

  const fallback = await supabase
    .from('company_strategies')
    .select(
      'id, company_id, company_goals:main_goals, red_flags, competition:competitive_situation, next_steps, updated_at',
    )
    .eq('company_id', companyId)
    .maybeSingle()
  if (fallback.error || !fallback.data) return null
  return toCompanyStrategyRow({
    ...fallback.data,
    value_proposition: null,
    metrics_pain: null,
    mh_assessment: null,
  })
}

export async function upsertCompanyStrategyImpl(
  companyId: string,
  payload: {
    company_goals?: string | null
    red_flags?: string | null
    competition?: string | null
    next_steps?: string | null
    value_proposition?: string | null
    metrics_pain?: string | null
    mh_assessment?: Record<string, unknown> | null
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const full = await supabase.from('company_strategies').upsert(
    asTableInsert<'company_strategies'>({
      company_id: companyId,
      // DB-Spalten heißen main_goals und competitive_situation
      main_goals: payload.company_goals ?? null,
      red_flags: payload.red_flags ?? null,
      competitive_situation: payload.competition ?? null,
      next_steps: payload.next_steps ?? null,
      value_proposition: payload.value_proposition ?? null,
      metrics_pain: payload.metrics_pain ?? null,
      mh_assessment: asJson(payload.mh_assessment ?? {}),
      updated_at: new Date().toISOString(),
    }),
    { onConflict: 'company_id' },
  )
  if (!full.error) {
    revalidatePath(ROUTES.accounts)
    revalidatePath(ROUTES.accountsDetail(companyId))
    return { success: true }
  }

  const msg = (full.error.message ?? '').toLowerCase()
  const missingOptionalColumns =
    msg.includes('metrics_pain') ||
    msg.includes('mh_assessment') ||
    msg.includes('value_proposition')
  if (!missingOptionalColumns) return { success: false, error: full.error.message }

  const fallback = await supabase.from('company_strategies').upsert(
    {
      company_id: companyId,
      main_goals: payload.company_goals ?? null,
      red_flags: payload.red_flags ?? null,
      competitive_situation: payload.competition ?? null,
      next_steps: payload.next_steps ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id' },
  )
  if (fallback.error) return { success: false, error: fallback.error.message }
  revalidatePath(ROUTES.accounts)
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true }
}

export async function getRoadmapProjectsImpl(
  companyId: string,
): Promise<RoadmapProjectRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('company_roadmap_projects')
    .select('*')
    .eq('company_id', companyId)
    .order('target_date', { ascending: true, nullsFirst: false })
  return (data ?? []) as RoadmapProjectRow[]
}

export async function upsertRoadmapProjectImpl(
  companyId: string,
  payload: {
    id?: string
    project_name: string
    estimated_value?: string | null
    status?: string | null
    target_date?: string | null
    tags?: string | null
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const row = {
    company_id: companyId,
    project_name: payload.project_name.trim(),
    estimated_value: payload.estimated_value?.trim() || null,
    status: payload.status?.trim() || null,
    target_date: payload.target_date || null,
    tags: payload.tags?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  if (payload.id) {
    const { error } = await supabase
      .from('company_roadmap_projects')
      .update(row)
      .eq('id', payload.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('company_roadmap_projects').insert(row)
    if (error) return { success: false, error: error.message }
  }
  revalidatePath(ROUTES.accountsDetail(companyId))
  return { success: true }
}

export async function deleteRoadmapProjectImpl(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: row } = await supabase
    .from('company_roadmap_projects')
    .select('company_id')
    .eq('id', id)
    .single()
  const { error } = await supabase.from('company_roadmap_projects').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  if (row?.company_id) revalidatePath(ROUTES.accountsDetail(row.company_id))
  return { success: true }
}

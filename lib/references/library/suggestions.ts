'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

function normalizeCompanyName(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export async function getIncumbentSuggestionsImpl(query: string): Promise<string[]> {
  const q = query.trim()
  if (!q) return []
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return []

  const pattern = `%${q}%`
  const { data, error } = await supabase
    .from('references')
    .select('incumbent_provider')
    .eq('organization_id', orgId)
    .ilike('incumbent_provider', pattern)
    .not('incumbent_provider', 'is', null)
    .limit(50)
  if (error || !data) return []

  const set = new Set<string>()
  for (const row of data) {
    const name = normalizeCompanyName(row.incumbent_provider as string | null)
    if (name) set.add(name)
  }
  return Array.from(set).sort()
}

export async function getCompetitorSuggestionsImpl(query: string): Promise<string[]> {
  const q = query.trim()
  if (!q) return []
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return []

  const pattern = `%${q}%`
  const { data, error } = await supabase
    .from('references')
    .select('competitors')
    .eq('organization_id', orgId)
    .not('competitors', 'is', null)
    .ilike('competitors', pattern)
    .limit(100)
  if (error || !data) return []

  const set = new Set<string>()
  for (const row of data) {
    const raw = row.competitors as string | null
    if (!raw) continue
    raw
      .split(/[;,]+/)
      .map((s) => normalizeCompanyName(s))
      .filter((s): s is string => !!s)
      .forEach((name) => set.add(name))
  }
  return Array.from(set).sort()
}


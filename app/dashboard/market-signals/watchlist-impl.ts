import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import type { WatchlistCompanyResult } from './market-signal-action-types'

function normalizeChampionKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function setCompanyWatchlistStateImpl(
  companyId: string,
  isFollowing: boolean,
) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nicht angemeldet' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false as const, error: 'Keine Organisation gefunden' }

  const { error } = await supabase
    .from('companies')
    .update({ is_favorite: isFollowing })
    .eq('id', companyId)
    .eq('organization_id', orgId)
  if (error) return { success: false as const, error: error.message }

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.marketSignalsManage)
  return { success: true as const }
}

export async function setCompaniesWatchlistStateImpl(
  companyIds: string[],
  isFollowing: boolean,
) {
  const ids = Array.from(new Set(companyIds.map((id) => id.trim()).filter(Boolean)))
  if (ids.length === 0) return { success: true as const, updated: 0 }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nicht angemeldet' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false as const, error: 'Keine Organisation gefunden' }

  const { error } = await supabase
    .from('companies')
    .update({ is_favorite: isFollowing })
    .eq('organization_id', orgId)
    .in('id', ids)
  if (error) return { success: false as const, error: error.message }

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.marketSignalsManage)
  return { success: true as const, updated: ids.length }
}

/** Bestehenden Account beobachten oder aus Brandfetch als Target anlegen und beobachten. */
export async function watchCompanyFromSuggestionImpl(input: {
  id: string
  name: string
}): Promise<
  { success: true; company: WatchlistCompanyResult } | { success: false; error: string }
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  const orgId = profile?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden' }

  const suggestionId = input.id.trim()
  const fallbackName = input.name.trim()
  if (!suggestionId) return { success: false, error: 'Kein Unternehmen ausgewählt' }

  if (!suggestionId.startsWith('brandfetch:')) {
    const { data: existing, error: loadError } = await supabase
      .from('companies')
      .select('id,name,logo_url,account_status,is_favorite')
      .eq('id', suggestionId)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (loadError) return { success: false, error: loadError.message }
    if (!existing?.id) return { success: false, error: 'Account nicht gefunden' }

    const { error } = await supabase
      .from('companies')
      .update({ is_favorite: true })
      .eq('id', existing.id)
      .eq('organization_id', orgId)
    if (error) return { success: false, error: error.message }

    revalidatePath(ROUTES.marketSignals)
    revalidatePath(ROUTES.marketSignalsManage)
    return {
      success: true,
      company: {
        id: existing.id,
        name: (existing.name ?? fallbackName) || 'Unbekannt',
        logoUrl: existing.logo_url ?? null,
        isFollowing: true,
        accountStatus: existing.account_status ?? null,
      },
    }
  }

  const domain = suggestionId.slice('brandfetch:'.length).trim()
  if (!domain) return { success: false, error: 'Ungültiger Markenvorschlag' }

  const { enrichAndSaveCompany } = await import('@/app/dashboard/references/new/actions')
  const enriched = await enrichAndSaveCompany(domain)
  if (!enriched.success) return { success: false, error: enriched.error }

  const { data: current, error: loadError } = await supabase
    .from('companies')
    .select('id,name,logo_url,account_status')
    .eq('id', enriched.company_id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (loadError) return { success: false, error: loadError.message }
  if (!current?.id) return { success: false, error: 'Account nicht gefunden' }

  const patch: {
    is_favorite: boolean
    entity_kind: 'account'
    account_status?: 'target'
  } = {
    is_favorite: true,
    entity_kind: 'account',
  }
  // Neue Prospects ohne Status als Target; bestehende Kundenstatus nicht überschreiben.
  if (!current.account_status) {
    patch.account_status = 'target'
  }

  const { data: updated, error: updateError } = await supabase
    .from('companies')
    .update(patch)
    .eq('id', current.id)
    .eq('organization_id', orgId)
    .select('id,name,logo_url,account_status')
    .single()
  if (updateError) return { success: false, error: updateError.message }

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.marketSignalsManage)
  revalidatePath(ROUTES.accounts)
  return {
    success: true,
    company: {
      id: updated.id,
      name: updated.name ?? enriched.company_name,
      logoUrl: updated.logo_url ?? enriched.logo_url ?? null,
      isFollowing: true,
      accountStatus: updated.account_status ?? patch.account_status ?? null,
    },
  }
}

export async function setChampionWatchlistStateImpl(
  personName: string,
  isFollowing: boolean,
  companyName?: string | null,
) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nicht angemeldet' }

  const trimmed = personName.trim()
  if (!trimmed) return { success: false as const, error: 'Champion-Name fehlt' }
  const key = normalizeChampionKey(trimmed)
  if (!key) return { success: false as const, error: 'Champion-Name fehlt' }
  const company = String(companyName ?? '').trim() || null

  if (isFollowing) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()
    const orgId = profile?.organization_id

    let personTitle: string | null = null
    if (orgId) {
      const { resolveChampionPersonTitle } =
        await import('@/lib/market-signals/champion-display')
      personTitle = await resolveChampionPersonTitle(supabase, orgId, trimmed, company)
    }

    const payload: {
      user_id: string
      person_key: string
      person_name: string
      company_name: string | null
      is_active: boolean
      person_title?: string
    } = {
      user_id: user.id,
      person_key: key,
      person_name: trimmed,
      company_name: company,
      is_active: true,
    }
    if (personTitle) payload.person_title = personTitle

    const { error } = await supabase
      .from('market_signal_champion_watchlist')
      .upsert(payload, { onConflict: 'user_id,person_key' })
    if (error) {
      return { success: false as const, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('market_signal_champion_watchlist')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('person_key', key)
    if (error) return { success: false as const, error: error.message }
  }

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.marketSignalsManage)
  return { success: true as const }
}

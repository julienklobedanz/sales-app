'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

function normalizeChampionKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function markMarketSignalNotificationsRead(keys: string[]) {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)))
  if (!uniqueKeys.length) return { success: true as const }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nicht angemeldet' }

  const rows = uniqueKeys.map((key) => ({
    user_id: user.id,
    notification_key: key,
    read_at: new Date().toISOString(),
  }))

  const { data: existingRows, error: existingError } = await supabase
    .from('notification_inbox_reads')
    .select('notification_key')
    .eq('user_id', user.id)
    .in('notification_key', uniqueKeys)
  if (existingError) return { success: false as const, error: existingError.message }

  const existingKeys = new Set(
    (existingRows ?? []).map((row) => String((row as { notification_key?: string | null }).notification_key ?? ''))
  )
  const toInsert = rows.filter((row) => !existingKeys.has(row.notification_key))
  if (toInsert.length === 0) return { success: true as const }

  const { error } = await supabase.from('notification_inbox_reads').insert(toInsert)
  if (error) return { success: false as const, error: error.message }

  revalidatePath(ROUTES.marketSignals)
  return { success: true as const }
}

export async function setCompanyWatchlistState(companyId: string, isFollowing: boolean) {
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
  const orgId = (profile as { organization_id?: string | null } | null)?.organization_id
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

export async function setChampionWatchlistState(personName: string, isFollowing: boolean) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nicht angemeldet' }

  const trimmed = personName.trim()
  if (!trimmed) return { success: false as const, error: 'Champion-Name fehlt' }
  const key = normalizeChampionKey(trimmed)
  if (!key) return { success: false as const, error: 'Champion-Name fehlt' }

  if (isFollowing) {
    const { error } = await supabase.from('market_signal_champion_watchlist').insert({
      user_id: user.id,
      person_key: key,
      person_name: trimmed,
    })
    if (error && !String(error.message ?? '').toLowerCase().includes('duplicate key')) {
      return { success: false as const, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('market_signal_champion_watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('person_key', key)
    if (error) return { success: false as const, error: error.message }
  }

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.marketSignalsManage)
  return { success: true as const }
}

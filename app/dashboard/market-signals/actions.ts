'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

function normalizeChampionKey(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function upsertNotificationKeys(keys: string[]) {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)))
  if (!uniqueKeys.length) return { success: true as const }
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nicht angemeldet' }

  const { data: existingRows, error: existingError } = await supabase
    .from('notification_inbox_reads')
    .select('notification_key')
    .eq('user_id', user.id)
    .in('notification_key', uniqueKeys)
  if (existingError) return { success: false as const, error: existingError.message }

  const existingKeys = new Set(
    (existingRows ?? []).map((row) => String((row as { notification_key?: string | null }).notification_key ?? ''))
  )
  const toInsert = uniqueKeys
    .filter((key) => !existingKeys.has(key))
    .map((key) => ({ user_id: user.id, notification_key: key, read_at: new Date().toISOString() }))
  if (!toInsert.length) return { success: true as const }

  const { error } = await supabase.from('notification_inbox_reads').insert(toInsert)
  if (error) return { success: false as const, error: error.message }
  return { success: true as const }
}

export async function markMarketSignalNotificationsRead(keys: string[]) {
  const result = await upsertNotificationKeys(keys)
  if (!result.success) return result
  revalidatePath(ROUTES.marketSignals)
  return result
}

export async function markMarketSignalsIrrelevant(keys: string[]) {
  const irrelevantKeys = keys
    .filter(Boolean)
    .map((key) => `market_irrelevant:${key}`)
  const result = await upsertNotificationKeys(irrelevantKeys)
  if (!result.success) return result
  revalidatePath(ROUTES.marketSignals)
  return result
}

export async function addMarketSignalToDeal(args: {
  dealId: string
  companyId: string
  signalKey: string
  referenceIds?: string[]
}): Promise<{ success: true; added: number } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet' }

  const dealId = String(args.dealId ?? '').trim()
  const companyId = String(args.companyId ?? '').trim()
  const signalKey = String(args.signalKey ?? '').trim()
  if (!dealId || !companyId || !signalKey) {
    return { success: false, error: 'Ungültige Anfrage.' }
  }

  // Validate deal belongs to user org (RLS will also enforce, but this gives a clearer error).
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  const orgId = (profile as { organization_id?: string | null } | null)?.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden' }

  const { count: dealCount, error: dealErr } = await supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('id', dealId)
    .eq('organization_id', orgId)
  if (dealErr) return { success: false, error: dealErr.message }
  if (!dealCount) return { success: false, error: 'Deal nicht gefunden.' }

  const inputRefs = Array.from(new Set((args.referenceIds ?? []).filter(Boolean))).slice(
    0,
    2
  )

  let referenceIds: string[] = inputRefs
  if (!referenceIds.length) {
    const { data: refRows, error: refErr } = await supabase
      .from('references')
      .select('id')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(2)
    if (refErr) return { success: false, error: refErr.message }
    referenceIds = (refRows ?? [])
      .map((r) => String((r as { id?: string | null }).id ?? ''))
      .filter(Boolean)
      .slice(0, 2)
  }

  if (!referenceIds.length) {
    // still archive, to allow inbox-zero on "no refs"
    await markMarketSignalsIrrelevant([signalKey])
    return { success: true, added: 0 }
  }

  // Validate references belong to company (and are visible under RLS).
  const { data: validRefs, error: validErr } = await supabase
    .from('references')
    .select('id')
    .in('id', referenceIds)
    .eq('company_id', companyId)
  if (validErr) return { success: false, error: validErr.message }
  const validRefIds = new Set(
    (validRefs ?? [])
      .map((r) => String((r as { id?: string | null }).id ?? ''))
      .filter(Boolean)
  )
  const safeRefIds = referenceIds.filter((id) => validRefIds.has(id))

  let added = 0
  for (const refId of safeRefIds) {
    const { error } = await supabase
      .from('deal_references')
      .insert({ deal_id: dealId, reference_id: refId })
    if (error) {
      const msg = String(error.message ?? '').toLowerCase()
      if (msg.includes('duplicate key') || msg.includes('already exists')) continue
      return { success: false, error: error.message }
    }
    added++
  }

  await markMarketSignalsIrrelevant([signalKey])

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.deals.detail(dealId))
  return { success: true, added }
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

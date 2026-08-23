import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

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
    (existingRows ?? []).map((row) => String(row.notification_key ?? '')),
  )
  const toInsert = uniqueKeys
    .filter((key) => !existingKeys.has(key))
    .map((key) => ({
      user_id: user.id,
      notification_key: key,
      read_at: new Date().toISOString(),
    }))
  if (!toInsert.length) return { success: true as const }

  const { error } = await supabase.from('notification_inbox_reads').insert(toInsert)
  if (error) return { success: false as const, error: error.message }
  return { success: true as const }
}

async function getAuthedOrgContext() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, orgId: null as string | null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  return {
    supabase,
    user,
    orgId: profile?.organization_id ?? null,
  }
}

export async function markMarketSignalNotificationsReadImpl(keys: string[]) {
  const result = await upsertNotificationKeys(keys)
  if (!result.success) return result
  revalidatePath(ROUTES.marketSignals)
  return result
}

export async function markMarketSignalsIrrelevantImpl(keys: string[]) {
  const irrelevantKeys = keys.filter(Boolean).map((key) => `market_irrelevant:${key}`)
  const result = await upsertNotificationKeys(irrelevantKeys)
  if (!result.success) return result
  revalidatePath(ROUTES.marketSignals)
  return result
}

export async function snoozeMarketSignalImpl(args: {
  signalKey: string
  untilIso: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const { supabase, user } = await getAuthedOrgContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  const signalKey = String(args.signalKey ?? '').trim()
  const untilIso = String(args.untilIso ?? '').trim()
  if (!signalKey || !untilIso) return { success: false, error: 'Ungültige Anfrage.' }
  const { error: clearError } = await supabase
    .from('notification_inbox_reads')
    .delete()
    .eq('user_id', user.id)
    .like('notification_key', `market_snooze_until:%:${signalKey}`)
  if (clearError) return { success: false, error: clearError.message }
  const result = await upsertNotificationKeys([
    `market_snooze_until:${untilIso}:${signalKey}`,
  ])
  if (!result.success) return { success: false, error: result.error }
  revalidatePath(ROUTES.marketSignals)
  return { success: true }
}

export async function markMarketSignalOutcomeImpl(args: {
  signalKey: string
  stage: 'outreach' | 'meeting' | 'opportunity'
}): Promise<{ success: true } | { success: false; error: string }> {
  const { supabase, user } = await getAuthedOrgContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  const signalKey = String(args.signalKey ?? '').trim()
  if (!signalKey) return { success: false, error: 'Ungültiges Signal.' }
  const { error: clearError } = await supabase
    .from('notification_inbox_reads')
    .delete()
    .eq('user_id', user.id)
    .like('notification_key', `market_outcome:%:${signalKey}`)
  if (clearError) return { success: false, error: clearError.message }
  const result = await upsertNotificationKeys([
    `market_outcome:${args.stage}:${signalKey}`,
  ])
  if (!result.success) return { success: false, error: result.error }
  revalidatePath(ROUTES.marketSignals)
  return { success: true }
}

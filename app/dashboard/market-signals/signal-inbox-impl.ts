import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/lib/audit/log-audit'
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
    (existingRows ?? []).map((row) =>
      String((row as { notification_key?: string | null }).notification_key ?? ''),
    ),
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
    orgId:
      profile?.organization_id ?? null,
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

export async function addMarketSignalToDealImpl(args: {
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
  const orgId = profile?.organization_id
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
    2,
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
    await markMarketSignalsIrrelevantImpl([signalKey])
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
      .filter(Boolean),
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

  await markMarketSignalsIrrelevantImpl([signalKey])

  revalidatePath(ROUTES.marketSignals)
  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.deals.detail(dealId))
  return { success: true, added }
}

export async function setMarketSignalPriorityImpl(args: {
  signalKey: string
  priority: 'today' | 'none'
}): Promise<{ success: true } | { success: false; error: string }> {
  const { supabase, user } = await getAuthedOrgContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  const signalKey = String(args.signalKey ?? '').trim()
  if (!signalKey) return { success: false, error: 'Ungültiges Signal.' }
  const key = `market_priority:today:${signalKey}`
  if (args.priority === 'none') {
    const { error } = await supabase
      .from('notification_inbox_reads')
      .delete()
      .eq('user_id', user.id)
      .eq('notification_key', key)
    if (error) return { success: false, error: error.message }
  } else {
    const result = await upsertNotificationKeys([key])
    if (!result.success) return { success: false, error: result.error }
  }
  revalidatePath(ROUTES.marketSignals)
  return { success: true }
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

export async function submitMarketSignalDraftFeedbackImpl(args: {
  signalKey: string
  helpful: boolean
  reason?: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const { user, orgId } = await getAuthedOrgContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden.' }
  void writeAuditLog({
    orgId,
    action: 'market_signal_intro_feedback',
    entityId: args.signalKey,
    actionDetails: {
      helpful: args.helpful,
      reason: String(args.reason ?? '').trim() || null,
      userId: user.id,
    },
  })
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

export async function logMarketSignalQuickActionImpl(args: {
  signalKey: string
  channel: 'hubspot_email' | 'salesforce_task' | 'slack_mention'
}): Promise<{ success: true } | { success: false; error: string }> {
  const { user, orgId } = await getAuthedOrgContext()
  if (!user) return { success: false, error: 'Nicht angemeldet.' }
  if (!orgId) return { success: false, error: 'Keine Organisation gefunden.' }
  void writeAuditLog({
    orgId,
    action: 'market_signal_quick_action',
    entityId: args.signalKey,
    actionDetails: {
      channel: args.channel,
      userId: user.id,
      at: new Date().toISOString(),
    },
  })
  return { success: true }
}

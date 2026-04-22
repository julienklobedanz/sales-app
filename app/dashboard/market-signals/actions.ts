'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

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

  const { error } = await supabase.from('notification_inbox_reads').upsert(rows, {
    onConflict: 'user_id,notification_key',
  })
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

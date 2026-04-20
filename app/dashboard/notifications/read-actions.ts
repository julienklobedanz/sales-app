'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'

export async function markNotificationReadImpl(notificationKey: string) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nicht angemeldet' }

  const { error } = await supabase.from('notification_inbox_reads').upsert(
    {
      user_id: user.id,
      notification_key: notificationKey,
      read_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,notification_key' }
  )

  if (error) {
    console.error('[markNotificationRead]', error.message)
    return { success: false as const, error: error.message }
  }
  revalidatePath(ROUTES.home, 'layout')
  revalidatePath(ROUTES.evidence.root)
  return { success: true as const }
}

export async function markAllNotificationsReadImpl(notificationKeys: string[]) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nicht angemeldet' }
  if (!notificationKeys.length) return { success: true as const }

  const rows = notificationKeys.map((id) => ({
    user_id: user.id,
    notification_key: id,
    read_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('notification_inbox_reads').upsert(rows, {
    onConflict: 'user_id,notification_key',
  })

  if (error) {
    console.error('[markAllNotificationsRead]', error.message)
    return { success: false as const, error: error.message }
  }
  revalidatePath(ROUTES.home, 'layout')
  revalidatePath(ROUTES.evidence.root)
  return { success: true as const }
}

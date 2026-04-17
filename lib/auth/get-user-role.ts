import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AppRole } from '@/hooks/useRole'

/**
 * Rolle des aktuell angemeldeten Users (Server).
 * Entspricht `profiles.role` (`sales` | `account_manager` | `admin`).
 */
export async function getSessionAppRole(): Promise<AppRole | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const r = profile?.role
  if (r === 'admin' || r === 'sales' || r === 'account_manager') return r
  return 'sales'
}

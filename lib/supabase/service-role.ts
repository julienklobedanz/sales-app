import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-Role-Client nur für Server-seitige Admin-Aufgaben (z. B. generateLink).
 * Niemals im Browser verwenden; Key nicht exponieren.
 */
export function createServiceRoleSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

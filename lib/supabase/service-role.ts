import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Service-Role-Client nur für Server-seitige Admin-Aufgaben (umgeht RLS vollständig).
 * Niemals im Browser; Key nicht exponieren.
 * Konvention: Jede Aufrufstelle dokumentiert „Service-Role weil … / Grenze: …“ (siehe Agent-Guide §6).
 */
export function createServiceRoleSupabaseClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

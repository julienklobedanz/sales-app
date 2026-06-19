import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

export type IntegrationSupabaseConfig = {
  url: string
  anonKey: string
  serviceRoleKey: string
}

export function getIntegrationSupabaseConfig(): IntegrationSupabaseConfig | null {
  const url =
    process.env.SUPABASE_TEST_URL ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    'http://127.0.0.1:54321'
  const anonKey = process.env.SUPABASE_TEST_ANON_KEY ?? process.env.ANON_KEY
  const serviceRoleKey =
    process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY

  if (!anonKey || !serviceRoleKey) return null
  return { url, anonKey, serviceRoleKey }
}

export function isIntegrationSupabaseAvailable(): boolean {
  return getIntegrationSupabaseConfig() !== null
}

export function createIntegrationServiceClient(): SupabaseClient<Database> {
  const config = getIntegrationSupabaseConfig()
  if (!config) {
    throw new Error(
      'Integration Supabase nicht konfiguriert. Starte `supabase start` und setze SUPABASE_TEST_* oder nutze `supabase status -o env`.'
    )
  }
  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function createIntegrationAnonClient(): SupabaseClient<Database> {
  const config = getIntegrationSupabaseConfig()
  if (!config) {
    throw new Error('Integration Supabase nicht konfiguriert.')
  }
  return createClient<Database>(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function signInIntegrationUser(
  email: string,
  password: string
): Promise<SupabaseClient<Database>> {
  const client = createIntegrationAnonClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new Error(`Integration login fehlgeschlagen (${email}): ${error?.message ?? 'no session'}`)
  }
  return client
}

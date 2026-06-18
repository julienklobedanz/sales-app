import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase-Client für den Browser (Client Components, z. B. in "use client").
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

import type { SupabaseClient, User } from '@supabase/supabase-js'

import { log } from '@/lib/observability/logger'

function isFetchFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.message !== 'fetch failed') return false
  return true
}

/**
 * Liest die Session aus Cookies — ohne Auth-Server-Roundtrip.
 * Für Auth-Seiten (Login/Register), wo nur ein Redirect bei bestehender Session nötig ist.
 * Die Middleware aktualisiert die Session separat via getUser().
 *
 * Hinweis: getSession() validiert das JWT nicht serverseitig; für geschützte Routen
 * weiterhin safeAuthGetUser / getRequestUser verwenden.
 */
export async function getAuthPageUser(supabase: SupabaseClient): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user ?? null
}

/**
 * Verifiziert den User beim Auth-Server; bei Netzwerkfehlern null statt Crash.
 */
export async function safeAuthGetUser(supabase: SupabaseClient): Promise<User | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) {
      const message = error.message ?? ''
      const expected =
        message.includes('Auth session missing') ||
        message.includes('JWT') ||
        message.includes('session')
      if (!expected) {
        log.warn('auth.getUser.error', { message })
      }
      return null
    }
    return user
  } catch (error) {
    if (isFetchFailure(error)) {
      const cause =
        error instanceof Error && 'cause' in error
          ? String((error as Error & { cause?: unknown }).cause)
          : undefined
      log.warn('auth.getUser.fetch_failed', { cause })
      return null
    }
    throw error
  }
}

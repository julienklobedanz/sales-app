import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

/**
 * Zieladresse für „Referenzbedarf melden“: zuerst Env, sonst E-Mail des ersten Org-Admins (Service Role).
 */
export async function resolveReferenceManagerEmail(
  _supabase: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  const fromEnv = process.env.REFERENCE_MANAGER_EMAIL?.trim()
  if (fromEnv) return fromEnv

  const adminClient = createServiceRoleSupabaseClient()
  if (!adminClient) return null

  const { data: adminProfile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle()

  const adminId = (adminProfile as { id?: string } | null)?.id
  if (!adminId) return null

  const { data: userData, error } = await adminClient.auth.admin.getUserById(adminId)
  if (error || !userData?.user?.email) return null
  return userData.user.email.trim() || null
}

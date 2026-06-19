import 'server-only'

import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'

/** E-Mails aus `auth.users` (profiles hat keine email-Spalte). */
export async function resolveAuthEmailsByUserIds(
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  // Service-Role weil: auth.admin.getUserById (kein RLS-Pfad für E-Mails).
  // Grenze: nur die übergebene, vom Aufrufer bereits org-gefilterte userIds-Liste.
  const admin = createServiceRoleSupabaseClient()
  if (!admin || userIds.length === 0) return map

  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))]
  await Promise.all(
    unique.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      const email = data?.user?.email?.trim()
      if (email) map.set(id, email)
    })
  )
  return map
}

'use server'

import { revalidatePath } from 'next/cache'

import { getRequestEffectiveRoles } from '@/lib/auth/request-user'
import { deleteDemoWorkspaceSeed } from '@/lib/onboarding/seed-demo-workspace'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function deleteDemoSeedAction(): Promise<{
  success: boolean
  error?: string
}> {
  const effective = await getRequestEffectiveRoles()
  const orgId = effective?.profile.organization_id
  if (!orgId) return { success: false, error: 'Keine Organisation zugeordnet.' }

  const supabase = await createServerSupabaseClient()
  const result = await deleteDemoWorkspaceSeed(supabase, orgId)
  if (!result.success) return result

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.references.root)
  revalidatePath(ROUTES.deals.root)
  revalidatePath(ROUTES.accounts)
  return { success: true }
}

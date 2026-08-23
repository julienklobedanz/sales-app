import { revalidatePath } from 'next/cache'
import { ROUTES } from '@/lib/routes'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  normalizeAccountStatus,
} from '@/lib/accounts/account-status'
import { ensureBrandfetchDarkLogoUrl } from '@/lib/brandfetch/logo-theme-url'
import { scheduleCompanyNewsroomDiscovery } from '@/lib/market-signals/discover-company-newsroom'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { profileIsSalesRestricted } from '@/lib/roles/profile-guards'

export async function createCompanyImpl(payload: {
  name: string
  website_url?: string | null
  industry?: string | null
  headquarters?: string | null
  logo_url?: string | null
  employee_count?: number | null
  description?: string | null
  account_status?: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht eingeloggt.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id)
    return { success: false, error: 'Onboarding unvollständig.' }
  const { systemRole, functionRole } = parseProfileRoles(profile)
  if (profileIsSalesRestricted(systemRole, functionRole))
    return { success: false, error: 'Keine Berechtigung.' }

  const name = payload.name.trim()
  if (!name) return { success: false, error: 'Name ist erforderlich.' }

  const { data, error } = await supabase
    .from('companies')
    .insert({
      organization_id: profile.organization_id,
      entity_kind: 'account',
      name,
      website_url: payload.website_url?.trim() || null,
      industry: payload.industry?.trim() || null,
      headquarters: payload.headquarters?.trim() || null,
      logo_url: ensureBrandfetchDarkLogoUrl(payload.logo_url?.trim() || null),
      employee_count: payload.employee_count ?? null,
      description: payload.description?.trim() || null,
      account_status: normalizeAccountStatus(payload.account_status),
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  if (data?.id) {
    scheduleCompanyNewsroomDiscovery(
      supabase,
      data.id,
      payload.website_url?.trim() || null,
    )
  }

  revalidatePath(ROUTES.accounts)
  return { success: true, id: data?.id }
}

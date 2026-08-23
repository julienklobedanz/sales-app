import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getRequestProfile } from '@/lib/auth/request-user'
import { accountFromJoin } from '@/lib/accounts/account-from-join'

async function getSessionOrgId(): Promise<string | null> {
  const profile = await getRequestProfile()
  return profile?.organization_id ?? null
}

/** Referenzen der eigenen Org (id, title, company_name) für Verknüpfung mit Deal */
export async function getReferencesForOrgImpl(): Promise<
  { id: string; title: string; company_name: string }[]
> {
  const supabase = await createServerSupabaseClient()
  const orgId = await getSessionOrgId()
  if (!orgId) return []

  const { data: rows } = await supabase
    .from('references')
    .select('id, title, companies(name)')
    .eq('organization_id', orgId)
    .order('title')
  if (!rows) return []

  return rows.map((r) => {
    const company = accountFromJoin(r.companies)
    return {
      id: r.id,
      title: r.title ?? '',
      company_name: company?.name ?? '—',
    }
  })
}

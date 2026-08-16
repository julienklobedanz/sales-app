import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { notFound, redirect } from 'next/navigation'
import { accountsReadHref } from '@/lib/accounts/accounts-list-view'

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ openNda?: string; edit?: string; view?: string }>
}) {
  const { id } = await params
  const sp = (await searchParams) ?? {}
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: company } = await supabase
    .from('companies')
    .select('id, entity_kind')
    .eq('id', id)
    .maybeSingle()

  if (!company) notFound()

  if (company.entity_kind === 'partner') {
    redirect(`${ROUTES.accounts}?view=partner`)
  }

  const extra: Record<string, string> = {}
  if (sp.openNda === '1' || sp.openNda === 'true') extra.openNda = '1'
  redirect(accountsReadHref(id, extra))
}

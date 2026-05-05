import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { OnboardingWizard } from './onboarding-wizard'

type Props = { searchParams: Promise<{ invite?: string }> }

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const params = await searchParams
  let inviteToken = params.invite?.trim() || null
  if (!inviteToken) {
    inviteToken = (await cookies()).get('invite_token')?.value?.trim() || null
  }

  let inviteOrganizationName: string | null = null
  let inviteRole: 'admin' | 'sales' | 'account_manager' | null = null
  if (inviteToken) {
    const { data } = await supabase.rpc('get_invite_by_token', {
      invite_token: inviteToken,
    })
    const parsed = data as { organization_name?: string; role?: string | null } | null
    if (parsed?.organization_name) {
      inviteOrganizationName = parsed.organization_name
    }
    const r = parsed?.role
    if (r === 'admin' || r === 'sales' || r === 'account_manager') {
      inviteRole = r
    }
  }

  const meta = (user.user_metadata ?? {}) as { full_name?: string }
  const initialFullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : ''

  return (
    <OnboardingWizard
      inviteToken={inviteToken}
      inviteOrganizationName={inviteOrganizationName}
      inviteRole={inviteRole}
      initialFullName={initialFullName}
    />
  )
}

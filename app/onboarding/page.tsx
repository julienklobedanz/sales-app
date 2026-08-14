import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { OnboardingWizard } from './onboarding-wizard'
import { isHubSpotConfigured } from '@/lib/crm/hubspot/config'
import { parseInviteRpcJson } from '@/lib/invites/parse-invite-rpc'

type Props = {
  searchParams: Promise<{
    invite?: string
    crm_connected?: string
    crm_provider?: string
  }>
}

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
  if (inviteToken) {
    const { data } = await supabase.rpc('get_invite_by_token', {
      invite_token: inviteToken,
    })
    const parsed = parseInviteRpcJson(data)
    if (parsed?.organization_name) {
      inviteOrganizationName = parsed.organization_name
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  const meta = user.user_metadata
  const initialFullName =
    meta && typeof meta === 'object' && typeof meta.full_name === 'string'
      ? meta.full_name.trim()
      : ''

  return (
    <Suspense fallback={<div className="min-h-screen animate-pulse bg-accent/50" />}>
      <OnboardingWizard
        inviteToken={inviteToken}
        inviteOrganizationName={inviteOrganizationName}
        initialFullName={initialFullName}
        userEmail={user.email ?? ''}
        hubspotConfigured={isHubSpotConfigured()}
        hasOrganization={Boolean(profile?.organization_id)}
      />
    </Suspense>
  )
}

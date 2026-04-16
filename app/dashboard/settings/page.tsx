import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import { getTeamMembers } from './invite-actions'
import { SettingsProfileCard } from './settings-profile-card'
import { SettingsTeamCard } from './settings-team-card'
import { SettingsWorkspaceCard } from './settings-workspace-card'
import { SettingsBillingCard } from './settings-billing-card'
import { SettingsDangerZone } from './settings-danger-zone'

const CARD_CLASS =
  'rounded-3xl border bg-card text-card-foreground p-6 shadow-sm'
const SECTION_LABEL_CLASS =
  'text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3 block'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.login)

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const organizationId = profileRow?.organization_id ?? null
  const { data: orgRow } =
    organizationId &&
    (await supabase
      .from('organizations')
      .select('id, name, logo_url, primary_color, secondary_color, stripe_subscription_id, subscription_status')
      .eq('id', organizationId)
      .single())

  const teamMembers = await getTeamMembers()

  const fullName = profileRow?.full_name ?? ''
  const [firstName = '', ...rest] = fullName.trim().split(/\s+/)
  const lastName = rest.join(' ') ?? ''

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
        <p className="mt-1 text-muted-foreground">
          Verwalten Sie Ihr Profil, Team und Arbeitsbereich.
        </p>
      </div>

      {/* 1. Profil */}
      <section className="space-y-3">
        <span className={SECTION_LABEL_CLASS}>Profil</span>
        <div className={CARD_CLASS}>
          <SettingsProfileCard
            userEmail={user.email ?? ''}
            firstName={firstName}
            lastName={lastName}
            avatarUrl={(profileRow as { avatar_url?: string | null })?.avatar_url ?? null}
          />
        </div>
      </section>

      {/* 2. Team Management */}
      <section className="space-y-3">
        <span className={SECTION_LABEL_CLASS}>Teamverwaltung</span>
        <div className={CARD_CLASS}>
          <SettingsTeamCard initialMembers={teamMembers} />
        </div>
      </section>

      {/* 3. Organisation & Abrechnung */}
      <section className="space-y-3">
        <span className={SECTION_LABEL_CLASS}>Organisation & Abrechnung</span>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className={CARD_CLASS}>
            <SettingsWorkspaceCard
              organizationId={orgRow?.id ?? null}
              organizationName={orgRow?.name ?? ''}
              logoUrl={orgRow?.logo_url ?? null}
              primaryColor={(orgRow as { primary_color?: string | null } | null)?.primary_color ?? '#0f172a'}
              secondaryColor={(orgRow as { secondary_color?: string | null } | null)?.secondary_color ?? '#334155'}
            />
          </div>
          <div className={CARD_CLASS}>
            <SettingsBillingCard
              subscriptionStatus={orgRow?.subscription_status ?? null}
              subscriptionId={orgRow?.stripe_subscription_id ?? null}
            />
          </div>
        </div>
      </section>

      {/* 4. Danger Zone */}
      <section className="space-y-3">
        <span className={SECTION_LABEL_CLASS}>Gefahrenbereich</span>
        <SettingsDangerZone />
      </section>
    </div>
  )
}

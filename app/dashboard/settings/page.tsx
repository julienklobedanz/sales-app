import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { redirect } from 'next/navigation'
import type { AppRole } from '@/hooks/useRole'
import {
  DEV_ROLE_COOKIE,
  isDevRolePreviewEnabled,
  parseAppRoleCookie,
} from '@/lib/dev-role-preview'
import { getTeamMembers } from './invite-actions'
import { SettingsDangerZone } from './settings-danger-zone'
import { SettingsTabs } from './settings-tabs'

const SECTION_LABEL_CLASS =
  'text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3 block'

function parseExportSettings(raw: unknown): { pdf_layout?: 'one_pager' | 'detail' | 'anonymized'; pdf_logo_enabled?: boolean } {
  if (!raw || typeof raw !== 'object') return {}
  const obj = raw as Record<string, unknown>
  const layout = obj.pdf_layout
  const logo = obj.pdf_logo_enabled
  return {
    pdf_layout:
      layout === 'detail' || layout === 'anonymized' || layout === 'one_pager'
        ? layout
        : undefined,
    pdf_logo_enabled: typeof logo === 'boolean' ? logo : undefined,
  }
}

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
      .select('id, name, logo_url, primary_color, secondary_color, export_settings, stripe_subscription_id, subscription_status')
      .eq('id', organizationId)
      .single())

  const teamMembers = await getTeamMembers()

  const devRolePreviewEnabled = isDevRolePreviewEnabled()
  const cookieStore = await cookies()
  const previewRole = devRolePreviewEnabled
    ? parseAppRoleCookie(cookieStore.get(DEV_ROLE_COOKIE)?.value)
    : null
  const serverRole = (profileRow?.role ?? 'sales') as AppRole

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

      <SettingsTabs
        devRolePreview={
          devRolePreviewEnabled
            ? { serverRole, previewRole }
            : undefined
        }
        profile={{
          userEmail: user.email ?? '',
          firstName,
          lastName,
          avatarUrl: (profileRow as { avatar_url?: string | null })?.avatar_url ?? null,
        }}
        org={{
          id: orgRow?.id ?? null,
          name: orgRow?.name ?? '',
          logoUrl: orgRow?.logo_url ?? null,
          primaryColor:
            (orgRow as { primary_color?: string | null } | null)?.primary_color ??
            '#0f172a',
          secondaryColor:
            (orgRow as { secondary_color?: string | null } | null)
              ?.secondary_color ?? '#334155',
          exportSettings: parseExportSettings(
            (orgRow as { export_settings?: unknown } | null)?.export_settings
          ),
          subscriptionStatus: orgRow?.subscription_status ?? null,
          subscriptionId: orgRow?.stripe_subscription_id ?? null,
        }}
        teamMembers={teamMembers}
      />

      {/* 4. Danger Zone */}
      <section className="space-y-3">
        <span className={SECTION_LABEL_CLASS}>Gefahrenbereich</span>
        <SettingsDangerZone />
      </section>
    </div>
  )
}

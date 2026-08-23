'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/routes'
import { asTableInsert } from '@/lib/supabase/db-types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { inviteByEmail } from '@/app/(app)/settings/invite-actions'
import { seedDemoWorkspaceIfEmpty } from '@/lib/onboarding/seed-demo-workspace'
import {
  isValidSalesPhone,
  salesContactValidationMessage,
} from '@/lib/profile/sales-contact'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { parseInviteRoleDimensions } from '@/lib/roles/invite-roles'
import { profileIsSalesRestricted } from '@/lib/roles/profile-guards'
import { parseInviteRpcJson } from '@/lib/invites/parse-invite-rpc'
import { log } from '@/lib/observability/logger'

export type FinalizeWorkspaceResult =
  | { success: true }
  | { success: false; error: string }

export async function finalizeWorkspaceAndProfile(params: {
  inviteToken: string | null
  organizationName: string
  logoDataUrl: string | null
  systemRole?: SystemRole
  functionRole?: FunctionRole
  fullName: string
  phone: string
}): Promise<FinalizeWorkspaceResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const tokenFromCookie = (await cookies()).get('invite_token')?.value?.trim() || null
  const inviteToken = params.inviteToken?.trim() || tokenFromCookie

  // Invite: Organisation und Rolle aus Token (Rolle wird bei E-Mail-Einladung gesetzt)
  let organizationId: string | null = null
  let joinedViaInvite = false
  let inviteSystemRole: SystemRole = 'member'
  let inviteFunctionRole: FunctionRole = 'sales_rep'
  if (inviteToken) {
    const { data } = await supabase.rpc('get_invite_by_token', {
      invite_token: inviteToken,
    })
    const parsed = parseInviteRpcJson(data)
    if (parsed?.organization_id) {
      organizationId = parsed.organization_id
      joinedViaInvite = true
      const inviteRoles = parseInviteRoleDimensions(parsed)
      inviteSystemRole = inviteRoles.systemRole
      inviteFunctionRole = inviteRoles.functionRole
      ;(await cookies()).set('invite_token', '', { path: '/', maxAge: 0 })
    }
  }

  // Kein Invite: bestehende Org beibehalten oder neu anlegen
  if (!organizationId) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    const existingOrgId = existingProfile?.organization_id?.trim() || null
    if (existingOrgId) {
      organizationId = existingOrgId
      const orgUpdate: { updated_at: string; name?: string; logo_url?: string } = {
        updated_at: new Date().toISOString(),
      }
      const name = params.organizationName.trim()
      if (name) orgUpdate.name = name
      if (params.logoDataUrl) orgUpdate.logo_url = params.logoDataUrl
      if (orgUpdate.name || orgUpdate.logo_url) {
        await supabase.from('organizations').update(orgUpdate).eq('id', existingOrgId)
      }
    } else {
      const name = params.organizationName.trim()
      if (!name) return { success: false, error: 'Bitte Arbeitsbereich-Namen eingeben.' }
      const { data: newOrgId, error: orgError } = await supabase.rpc(
        'create_organization',
        {
          org_name: name,
        },
      )
      if (orgError || !newOrgId) {
        log.error('onboarding.createOrganizationFailed', {}, orgError)
        return { success: false, error: 'Fehler beim Anlegen des Arbeitsbereichs.' }
      }
      organizationId = newOrgId as string

      if (params.logoDataUrl) {
        await supabase
          .from('organizations')
          .update({ logo_url: params.logoDataUrl, updated_at: new Date().toISOString() })
          .eq('id', organizationId)
      }
    }
  }

  const chosenDims =
    params.systemRole && params.functionRole
      ? { systemRole: params.systemRole, functionRole: params.functionRole }
      : null

  let finalSystemRole: SystemRole
  let finalFunctionRole: FunctionRole
  if (!joinedViaInvite && !chosenDims) {
    finalSystemRole = 'admin'
    finalFunctionRole = 'sales_leader'
  } else if (joinedViaInvite) {
    finalSystemRole = inviteSystemRole
    finalFunctionRole = inviteFunctionRole
  } else {
    finalSystemRole = chosenDims!.systemRole
    finalFunctionRole = chosenDims!.functionRole
  }

  const nameTrim = params.fullName.trim()
  if (!nameTrim) {
    return { success: false, error: 'Bitte deinen vollständigen Namen eingeben.' }
  }

  const phoneTrim = params.phone.trim()
  const salesMsg = salesContactValidationMessage()
  if (profileIsSalesRestricted(finalSystemRole, finalFunctionRole)) {
    if (!user.email?.trim()) {
      return { success: false, error: salesMsg.email }
    }
    if (!isValidSalesPhone(phoneTrim)) {
      return { success: false, error: salesMsg.phone }
    }
  }

  const upsertPayload: Record<string, unknown> = {
    id: user.id,
    organization_id: organizationId,
    system_role: finalSystemRole,
    function_role: finalFunctionRole,
    full_name: nameTrim,
    phone: phoneTrim.length ? phoneTrim : null,
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(asTableInsert<'profiles'>(upsertPayload))
  if (error) return { success: false, error: error.message }

  if (!joinedViaInvite && organizationId) {
    await seedDemoWorkspaceIfEmpty(supabase, organizationId, user.id)
  }

  return { success: true }
}

export type SendInvitesResult =
  | {
      success: true
      invited: number
      emailsSent: number
      emailsFailed: number
      failures: Array<{ email: string; emailError?: string; fallbackInviteLink: string }>
    }
  | { success: false; error: string }

export async function sendTeamInvites(
  invites: Array<{
    email: string
    systemRole: SystemRole
    functionRole: FunctionRole
  }>,
): Promise<SendInvitesResult> {
  const unique = invites
    .map((i) => ({
      email: i.email.trim().toLowerCase(),
      systemRole: i.systemRole,
      functionRole: i.functionRole,
    }))
    .filter((i) => i.email.length > 0)
    .slice(0, 10)

  if (!unique.length) {
    return { success: true, invited: 0, emailsSent: 0, emailsFailed: 0, failures: [] }
  }

  let emailsSent = 0
  let emailsFailed = 0
  const failures: Array<{
    email: string
    emailError?: string
    fallbackInviteLink: string
  }> = []

  for (const inv of unique) {
    const res = await inviteByEmail(inv.email, {
      systemRole: inv.systemRole,
      functionRole: inv.functionRole,
    })
    if (!res.success) return res
    if (res.emailSent) {
      emailsSent += 1
    } else {
      emailsFailed += 1
      failures.push({
        email: inv.email,
        emailError: res.emailError,
        fallbackInviteLink: res.fallbackInviteLink,
      })
    }
  }

  return {
    success: true,
    invited: unique.length,
    emailsSent,
    emailsFailed,
    failures,
  }
}

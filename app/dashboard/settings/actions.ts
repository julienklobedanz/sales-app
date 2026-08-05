'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service-role'
import { asTableUpdate } from '@/lib/supabase/db-types'
import { getAppOrigin } from '@/lib/env/app-origin'
import { ROUTES } from '@/lib/routes'
import { validatePasswordPolicy } from '@/lib/security/password-policy'
import {
  isValidSalesPhone,
  salesContactValidationMessage,
} from '@/lib/profile/sales-contact'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import type { FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { FUNCTION_ROLES, SYSTEM_ROLES } from '@/lib/roles/capabilities'
import { isSystemAdmin } from '@/lib/roles/capability-access'
import { legacyRoleToDimensions } from '@/lib/roles/legacy-mapping'
import { isSalesAppView } from '@/lib/roles/reference-access'

function normalizeHttpsBookingUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? ''
  if (!t) return null
  try {
    const u = new URL(t)
    if (u.protocol !== 'https:') {
      return null
    }
    return u.toString()
  } catch {
    return null
  }
}

function parseDataUrlImage(
  dataUrl: string,
): { bytes: Uint8Array; contentType: string; ext: string } | null {
  const trimmed = dataUrl.trim()
  const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  const contentType = match[1]
  const b64 = match[2]
  const buf = Buffer.from(b64, 'base64')
  if (!buf.length) return null
  const ext =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/jpeg'
        ? 'jpg'
        : contentType === 'image/webp'
          ? 'webp'
          : 'png'
  return { bytes: new Uint8Array(buf), contentType, ext }
}

const SYSTEM_ROLE_SET = new Set<SystemRole>(SYSTEM_ROLES)
const FUNCTION_ROLE_SET = new Set<FunctionRole>(FUNCTION_ROLES)

function parseRoleDimensionsFromForm(formData: FormData): {
  systemRole: SystemRole
  functionRole: FunctionRole
} | null {
  const systemField = formData.get('systemRole')?.toString()
  const functionField = formData.get('functionRole')?.toString()
  if (
    systemField &&
    functionField &&
    SYSTEM_ROLE_SET.has(systemField as SystemRole) &&
    FUNCTION_ROLE_SET.has(functionField as FunctionRole)
  ) {
    return {
      systemRole: systemField as SystemRole,
      functionRole: functionField as FunctionRole,
    }
  }
  return null
}

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('phone, system_role, function_role, capabilities')
    .eq('id', user.id)
    .single()

  const parsedRoles = parseProfileRoles(profileRow ?? {})
  const existingPhone = String(
    (profileRow as { phone?: string | null })?.phone ?? '',
  ).trim()

  const firstName = formData.get('firstName')?.toString()?.trim()
  const lastName = formData.get('lastName')?.toString()?.trim()
  const fullNameSingle = formData.get('fullName')?.toString()?.trim()
  const fullNameFromParts = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const fullName = fullNameFromParts || (fullNameSingle ? fullNameSingle : undefined)
  const dimensionRoles = parseRoleDimensionsFromForm(formData)
  const roleField = formData.get('role')?.toString()
  const legacyRole =
    !dimensionRoles &&
    (roleField === 'admin' || roleField === 'sales' || roleField === 'account_manager')
      ? roleField
      : undefined
  const effectiveRoles = dimensionRoles
    ? dimensionRoles
    : legacyRole
      ? legacyRoleToDimensions(legacyRole)
      : { systemRole: parsedRoles.systemRole, functionRole: parsedRoles.functionRole }
  const avatarDataUrlRaw = formData.get('avatarDataUrl')?.toString() ?? undefined
  const avatarDataUrl =
    avatarDataUrlRaw !== undefined ? avatarDataUrlRaw.trim() || null : undefined
  const bookingUrlRaw = formData.get('bookingUrl')?.toString()?.trim() ?? ''
  const bookingUrlNormalized = bookingUrlRaw
    ? normalizeHttpsBookingUrl(bookingUrlRaw)
    : null
  if (bookingUrlRaw && !bookingUrlNormalized) {
    return { error: 'Buchungslink muss eine gültige https://-URL sein (z. B. Calendly).' }
  }

  const phoneRaw = formData.get('phone')?.toString() ?? ''
  const phoneTrim = phoneRaw.trim()
  const phoneAfterUpdate = formData.has('phone') ? phoneTrim : existingPhone

  if (isSalesAppView(effectiveRoles.systemRole, effectiveRoles.functionRole)) {
    const msg = salesContactValidationMessage()
    if (!user.email?.trim()) {
      return { error: msg.email }
    }
    if (!isValidSalesPhone(phoneAfterUpdate)) {
      return { error: msg.phone }
    }
  }

  const updates: Record<string, unknown> = {}

  if (fullName !== undefined && fullName !== '') updates.full_name = fullName
  if (dimensionRoles) {
    updates.system_role = dimensionRoles.systemRole
    updates.function_role = dimensionRoles.functionRole
  } else if (legacyRole) {
    const dims = legacyRoleToDimensions(legacyRole)
    updates.system_role = dims.systemRole
    updates.function_role = dims.functionRole
  }
  if (formData.has('bookingUrl')) {
    updates.booking_url = bookingUrlNormalized
  }
  if (formData.has('phone')) {
    updates.phone = phoneTrim.length ? phoneTrim : null
  }
  if (formData.has('jobTitle')) {
    const jt = formData.get('jobTitle')?.toString()?.trim() ?? ''
    updates.job_title = jt.length ? jt : null
  }
  if (avatarDataUrl !== undefined) {
    if (!avatarDataUrl) {
      updates.avatar_url = null
    } else {
      const parsed = parseDataUrlImage(avatarDataUrl)
      if (!parsed) {
        return { error: 'Ungültiges Avatar-Format.' }
      }
      const path = `${user.id}/avatar.${parsed.ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, parsed.bytes, {
          upsert: true,
          contentType: parsed.contentType,
          cacheControl: '3600',
        })
      if (uploadErr) {
        return { error: uploadErr.message }
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      updates.avatar_url = data.publicUrl
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(asTableUpdate<'profiles'>(updates))
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.settings)
  return { success: true }
}

export async function changeOwnPassword(
  formData: FormData,
): Promise<{ success?: true; error?: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return { error: 'Nicht authentifiziert.' }

  const currentPassword = formData.get('currentPassword')?.toString() ?? ''
  const newPassword = formData.get('newPassword')?.toString() ?? ''
  const confirmPassword = formData.get('confirmPassword')?.toString() ?? ''

  if (!currentPassword) return { error: 'Bitte aktuelles Passwort eingeben.' }
  if (!newPassword) return { error: 'Bitte neues Passwort eingeben.' }
  if (newPassword !== confirmPassword) {
    return { error: 'Die neuen Passwörter stimmen nicht überein.' }
  }
  const policy = validatePasswordPolicy(newPassword)
  if (!policy.ok) return { error: policy.error }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInError) {
    return { error: 'Aktuelles Passwort ist ungültig.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) return { error: updateError.message }

  revalidatePath(ROUTES.settings)
  return { success: true }
}

export async function requestEmailChange(input: {
  newEmail: string
  currentPassword: string
}): Promise<{ success: true; pendingEmail: string } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { success: false, error: 'Nicht authentifiziert.' }

  const newEmail = input.newEmail.trim().toLowerCase()
  const currentPassword = input.currentPassword
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { success: false, error: 'Bitte eine gültige E-Mail-Adresse eingeben.' }
  }
  if (newEmail === user.email.toLowerCase()) {
    return { success: false, error: 'Das ist bereits deine aktuelle E-Mail-Adresse.' }
  }
  if (!currentPassword) {
    return { success: false, error: 'Bitte aktuelles Passwort eingeben.' }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInError) {
    return { success: false, error: 'Aktuelles Passwort ist ungültig.' }
  }

  const { error: updateError } = await supabase.auth.updateUser(
    { email: newEmail },
    {
      emailRedirectTo: `${getAppOrigin()}${ROUTES.authCallback}?next=${encodeURIComponent(ROUTES.settings)}`,
    },
  )
  if (updateError) return { success: false, error: updateError.message }

  revalidatePath(ROUTES.settings)
  return { success: true, pendingEmail: newEmail }
}

export async function signOutOtherSessions(): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht authentifiziert.' }

  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function signOutAllSessions(): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht authentifiziert.' }

  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteOwnAccount(
  confirmEmail: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { success: false, error: 'Nicht authentifiziert.' }

  const typed = confirmEmail.trim().toLowerCase()
  if (!typed || typed !== user.email.toLowerCase()) {
    return { success: false, error: 'E-Mail stimmt nicht überein.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, system_role, function_role, capabilities')
    .eq('id', user.id)
    .maybeSingle()

  const organizationId = profile?.organization_id ?? null
  if (organizationId) {
    const roles = parseProfileRoles(profile ?? {})
    const { data: members } = await supabase
      .from('profiles')
      .select('id, system_role')
      .eq('organization_id', organizationId)

    const otherMembers = (members ?? []).filter((m) => m.id !== user.id)
    if (otherMembers.length > 0 && isSystemAdmin(roles.systemRole)) {
      const otherAdmins = otherMembers.filter((m) =>
        isSystemAdmin(parseProfileRoles({ system_role: m.system_role }).systemRole),
      )
      if (otherAdmins.length === 0) {
        return {
          success: false,
          error:
            'Du bist der letzte Admin dieses Workspace. Bitte ernenne zuerst einen anderen Admin oder lösche den Workspace.',
        }
      }
    }
  }

  // Service-Role weil Auth-User-Löschung Admin-API braucht / Grenze: nur eigener User nach Confirm.
  const admin = createServiceRoleSupabaseClient()
  if (!admin) {
    return { success: false, error: 'Kontolöschung ist serverseitig nicht konfiguriert.' }
  }

  if (organizationId) {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
    if ((count ?? 0) <= 1) {
      const { error: orgDeleteError } = await admin
        .from('organizations')
        .delete()
        .eq('id', organizationId)
      if (orgDeleteError) {
        return { success: false, error: orgDeleteError.message }
      }
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) return { success: false, error: deleteError.message }

  await supabase.auth.signOut({ scope: 'global' })
  return { success: true }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/routes'
import { validatePasswordPolicy } from '@/lib/security/password-policy'
import { isValidSalesPhone, salesContactValidationMessage } from '@/lib/profile/sales-contact'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
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

function parseDataUrlImage(dataUrl: string): { bytes: Uint8Array; contentType: string; ext: string } | null {
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

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Nicht authentifiziert')

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, phone, system_role, function_role, capabilities')
    .eq('id', user.id)
    .single()

  const parsedRoles = parseProfileRoles(profileRow ?? {})
  const existingPhone = String((profileRow as { phone?: string | null })?.phone ?? '').trim()

  const firstName = formData.get('firstName')?.toString()?.trim()
  const lastName = formData.get('lastName')?.toString()?.trim()
  const fullNameSingle = formData.get('fullName')?.toString()?.trim()
  const fullNameFromParts = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const fullName = fullNameFromParts || (fullNameSingle ? fullNameSingle : undefined)
  const roleField = formData.get('role')?.toString()
  const role =
    roleField === 'admin' || roleField === 'sales' || roleField === 'account_manager'
      ? roleField
      : undefined
  const effectiveRoles = role
    ? legacyRoleToDimensions(role)
    : { systemRole: parsedRoles.systemRole, functionRole: parsedRoles.functionRole }
  const avatarDataUrlRaw = formData.get('avatarDataUrl')?.toString() ?? undefined
  const avatarDataUrl =
    avatarDataUrlRaw !== undefined ? avatarDataUrlRaw.trim() || null : undefined
  const bookingUrlRaw = formData.get('bookingUrl')?.toString()?.trim() ?? ''
  const bookingUrlNormalized = bookingUrlRaw ? normalizeHttpsBookingUrl(bookingUrlRaw) : null
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
  if (role) {
    const dims = legacyRoleToDimensions(role)
    updates.role = role
    updates.system_role = dims.systemRole
    updates.function_role = dims.functionRole
  }
  if (formData.has('bookingUrl')) {
    updates.booking_url = bookingUrlNormalized
  }
  if (formData.has('phone')) {
    updates.phone = phoneTrim.length ? phoneTrim : null
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
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(ROUTES.home)
  revalidatePath(ROUTES.settings)
  return { success: true }
}

export async function changeOwnPassword(formData: FormData): Promise<{ success?: true; error?: string }> {
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

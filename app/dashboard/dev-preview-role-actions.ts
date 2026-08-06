'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getRequestProfile } from '@/lib/auth/request-user'
import {
  canUseDevRolePreview,
  DEV_ROLE_COOKIE,
  formatDevRolePreviewCookie,
  type DevRolePreview,
} from '@/lib/dev-role-preview'
import { parseProfileRoles } from '@/lib/roles/profile-roles'
import { ROUTES } from '@/lib/routes'

function revalidateDashboardRole() {
  revalidatePath(ROUTES.home, 'layout')
}

export type SetDevPreviewRoleResult = { success: true } | { success: false; error: string }

async function assertDevRolePreviewAllowed(): Promise<
  SetDevPreviewRoleResult | { success: true }
> {
  const profile = await getRequestProfile()
  if (!profile) {
    return { success: false, error: 'Profil nicht gefunden.' }
  }
  const { systemRole } = parseProfileRoles(profile)
  if (!canUseDevRolePreview(systemRole)) {
    return {
      success: false,
      error: 'Rollen-Vorschau ist in dieser Umgebung nicht verfügbar.',
    }
  }
  return { success: true }
}

export async function setDevPreviewRole(
  preview: DevRolePreview,
): Promise<SetDevPreviewRoleResult> {
  const allowed = await assertDevRolePreviewAllowed()
  if (!allowed.success) return allowed

  try {
    const jar = await cookies()
    jar.set(DEV_ROLE_COOKIE, formatDevRolePreviewCookie(preview), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      httpOnly: true,
    })
    revalidateDashboardRole()
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Rolle konnte nicht gesetzt werden.',
    }
  }
}

export async function clearDevPreviewRole() {
  const allowed = await assertDevRolePreviewAllowed()
  if (!allowed.success) {
    return allowed
  }
  const jar = await cookies()
  jar.set(DEV_ROLE_COOKIE, '', { path: '/', maxAge: 0 })
  revalidateDashboardRole()
  return { success: true as const }
}

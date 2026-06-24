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

export type SetDevPreviewRoleResult =
  | { ok: true }
  | { ok: false; error: string }

async function assertDevRolePreviewAllowed(): Promise<SetDevPreviewRoleResult | { ok: true }> {
  const profile = await getRequestProfile()
  if (!profile) {
    return { ok: false, error: 'Profil nicht gefunden.' }
  }
  const { systemRole } = parseProfileRoles(profile)
  if (!canUseDevRolePreview(systemRole)) {
    return {
      ok: false,
      error: 'Rollen-Vorschau ist in dieser Umgebung nicht verfügbar.',
    }
  }
  return { ok: true }
}

export async function setDevPreviewRole(preview: DevRolePreview): Promise<SetDevPreviewRoleResult> {
  const allowed = await assertDevRolePreviewAllowed()
  if (!allowed.ok) return allowed

  try {
    const jar = await cookies()
    jar.set(DEV_ROLE_COOKIE, formatDevRolePreviewCookie(preview), {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      httpOnly: true,
    })
    revalidateDashboardRole()
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Rolle konnte nicht gesetzt werden.',
    }
  }
}

export async function clearDevPreviewRole() {
  const allowed = await assertDevRolePreviewAllowed()
  if (!allowed.ok) {
    return allowed
  }
  const jar = await cookies()
  jar.set(DEV_ROLE_COOKIE, '', { path: '/', maxAge: 0 })
  revalidateDashboardRole()
  return { ok: true as const }
}

'use server'

import { cookies } from 'next/headers'
import type { AppRole } from '@/hooks/useRole'
import { DEV_ROLE_COOKIE, isDevRolePreviewEnabled } from '@/lib/dev-role-preview'

export async function setDevPreviewRole(role: AppRole) {
  if (!isDevRolePreviewEnabled()) {
    return { ok: false as const, error: 'Rollen-Vorschau ist nicht aktiv.' }
  }
  const jar = await cookies()
  jar.set(DEV_ROLE_COOKIE, role, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    httpOnly: true,
  })
  return { ok: true as const }
}

export async function clearDevPreviewRole() {
  if (!isDevRolePreviewEnabled()) return { ok: true as const }
  const jar = await cookies()
  jar.delete(DEV_ROLE_COOKIE)
  return { ok: true as const }
}

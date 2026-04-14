import type { AppRole } from '@/hooks/useRole'

/** Cookie-Name: nur gültig wenn {@link isDevRolePreviewEnabled}. */
export const DEV_ROLE_COOKIE = 'refstack_dev_role'

/** Rollen-Vorschau: `next dev` (oder next.config-Default), Server-Env, oder NEXT_PUBLIC explizit. */
export function isDevRolePreviewEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DEV_ROLE_SWITCHER === 'false') return false
  const pub = process.env.NEXT_PUBLIC_DEV_ROLE_SWITCHER
  if (pub === 'true' || pub === '1') return true
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.DEV_ROLE_PREVIEW === '1'
  )
}

export function parseAppRoleCookie(value: string | undefined): AppRole | null {
  if (!value) return null
  if (value === 'admin' || value === 'sales' || value === 'account_manager') return value
  return null
}

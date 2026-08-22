import { getAppOrigin } from '@/lib/env/app-origin'
import { ROUTES } from '@/lib/routes'

export function resolvePostAuthPath(inviteToken?: string | null): string {
  const token = inviteToken?.trim()
  if (token) {
    return `${ROUTES.onboarding}?invite=${encodeURIComponent(token)}`
  }
  return ROUTES.home
}

export function buildAuthCallbackUrl(nextPath: string): string {
  const origin = getAppOrigin()
  return `${origin}${ROUTES.authCallback}?next=${encodeURIComponent(nextPath)}`
}

function extractEmailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at <= 0 || at === trimmed.length - 1) return null
  return trimmed.slice(at + 1)
}

export function normalizeSsoDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null
  if (trimmed.includes('@')) {
    return extractEmailDomain(trimmed)
  }
  return trimmed.replace(/^@/, '')
}

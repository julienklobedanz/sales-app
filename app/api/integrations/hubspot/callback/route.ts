import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getAppOrigin } from '@/lib/env/app-origin'
import { upsertOrganizationCrmConnection } from '@/lib/crm/connections'
import { requireCrmAdmin } from '@/lib/crm/require-crm-admin'
import {
  exchangeHubSpotAuthorizationCode,
  HUBSPOT_OAUTH_STATE_COOKIE,
} from '@/lib/crm/hubspot/oauth'
import {
  buildHubSpotOAuthCallbackPath,
  HUBSPOT_OAUTH_RETURN_COOKIE,
  parseHubSpotOAuthReturnTo,
} from '@/lib/crm/hubspot/oauth-return'
import { log } from '@/lib/observability/logger'

function redirectWithStatus(status: 'success' | 'error', returnTo: ReturnType<typeof parseHubSpotOAuthReturnTo>) {
  return NextResponse.redirect(
    `${getAppOrigin()}${buildHubSpotOAuthCallbackPath(returnTo, status)}`
  )
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const returnTo = parseHubSpotOAuthReturnTo(
    cookieStore.get(HUBSPOT_OAUTH_RETURN_COOKIE)?.value
  )
  cookieStore.set(HUBSPOT_OAUTH_RETURN_COOKIE, '', { path: '/', maxAge: 0 })

  try {
    const guard = await requireCrmAdmin()
    if (!guard.ok) {
      return redirectWithStatus('error', returnTo)
    }

    const url = new URL(request.url)
    const code = url.searchParams.get('code')?.trim()
    const state = url.searchParams.get('state')?.trim()
    const oauthError = url.searchParams.get('error')?.trim()

    if (oauthError || !code || !state) {
      return redirectWithStatus('error', returnTo)
    }

    const expectedState = cookieStore.get(HUBSPOT_OAUTH_STATE_COOKIE)?.value?.trim()
    cookieStore.set(HUBSPOT_OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 })

    if (!expectedState || expectedState !== state) {
      return redirectWithStatus('error', returnTo)
    }

    const tokens = await exchangeHubSpotAuthorizationCode(code)
    if (!tokens.success) {
      log.error('token exchange failed', { action: 'hubspot.callback.tokenExchange' }, tokens.error)
      return redirectWithStatus('error', returnTo)
    }

    const saved = await upsertOrganizationCrmConnection(guard.ctx.supabase, {
      organizationId: guard.ctx.organizationId,
      provider: 'hubspot',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      externalAccountId: tokens.hubId,
      connectedBy: guard.ctx.user.id,
    })

    if (!saved.success) {
      log.error('save failed', { action: 'hubspot.callback.save' }, saved.error)
      return redirectWithStatus('error', returnTo)
    }

    return redirectWithStatus('success', returnTo)
  } catch (error) {
    log.error('callback failed', { action: 'hubspot.callback' }, error)
    return redirectWithStatus('error', returnTo)
  }
}

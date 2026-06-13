import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getAppOrigin } from '@/lib/env/app-origin'
import { upsertOrganizationCrmConnection } from '@/lib/crm/connections'
import { ROUTES } from '@/lib/routes'
import { requireCrmAdmin } from '@/lib/crm/require-crm-admin'
import {
  exchangeHubSpotAuthorizationCode,
  HUBSPOT_OAUTH_STATE_COOKIE,
} from '@/lib/crm/hubspot/oauth'

function redirectWithStatus(status: 'success' | 'error') {
  const url = new URL(ROUTES.accounts, getAppOrigin())
  url.searchParams.set('crm_connected', status)
  url.searchParams.set('crm_provider', 'hubspot')
  if (status === 'success') {
    url.searchParams.set('crm_import', '1')
  }
  return NextResponse.redirect(url.toString())
}

export async function GET(request: Request) {
  try {
    const guard = await requireCrmAdmin()
    if (!guard.ok) {
      return redirectWithStatus('error')
    }

    const url = new URL(request.url)
    const code = url.searchParams.get('code')?.trim()
    const state = url.searchParams.get('state')?.trim()
    const oauthError = url.searchParams.get('error')?.trim()

    if (oauthError || !code || !state) {
      return redirectWithStatus('error')
    }

    const cookieStore = await cookies()
    const expectedState = cookieStore.get(HUBSPOT_OAUTH_STATE_COOKIE)?.value?.trim()
    cookieStore.set(HUBSPOT_OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 })

    if (!expectedState || expectedState !== state) {
      return redirectWithStatus('error')
    }

    const tokens = await exchangeHubSpotAuthorizationCode(code)
    if (!tokens.success) {
      console.error('[hubspot/callback] token exchange failed:', tokens.error)
      return redirectWithStatus('error')
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
      console.error('[hubspot/callback] save failed:', saved.error)
      return redirectWithStatus('error')
    }

    return redirectWithStatus('success')
  } catch (error) {
    console.error('[hubspot/callback]', error)
    return redirectWithStatus('error')
  }
}

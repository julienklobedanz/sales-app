import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getAppOrigin } from '@/lib/env/app-origin'
import { requireCrmAdmin } from '@/lib/crm/require-crm-admin'
import {
  buildHubSpotAuthorizeUrl,
  createHubSpotOAuthState,
  HUBSPOT_OAUTH_STATE_COOKIE,
} from '@/lib/crm/hubspot/oauth'
import { isHubSpotConfigured } from '@/lib/crm/hubspot/config'
import {
  buildHubSpotOAuthCallbackPath,
  HUBSPOT_OAUTH_RETURN_COOKIE,
  parseHubSpotOAuthReturnTo,
} from '@/lib/crm/hubspot/oauth-return'
import { log } from '@/lib/observability/logger'

function redirectWithError(returnTo: ReturnType<typeof parseHubSpotOAuthReturnTo>) {
  return NextResponse.redirect(
    `${getAppOrigin()}${buildHubSpotOAuthCallbackPath(returnTo, 'error', { openImport: false })}`,
  )
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const returnTo = parseHubSpotOAuthReturnTo(requestUrl.searchParams.get('returnTo'))

  try {
    const guard = await requireCrmAdmin()
    if (!guard.success) {
      return redirectWithError(returnTo)
    }

    if (!isHubSpotConfigured()) {
      return redirectWithError(returnTo)
    }

    const state = createHubSpotOAuthState()
    const authorizeUrl = buildHubSpotAuthorizeUrl(state)
    if (!authorizeUrl) {
      return redirectWithError(returnTo)
    }

    const cookieStore = await cookies()
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 600,
    }

    cookieStore.set(HUBSPOT_OAUTH_STATE_COOKIE, state, cookieOptions)
    cookieStore.set(HUBSPOT_OAUTH_RETURN_COOKIE, returnTo, cookieOptions)

    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    log.error('connect failed', { action: 'hubspot.connect' }, error)
    return redirectWithError(returnTo)
  }
}

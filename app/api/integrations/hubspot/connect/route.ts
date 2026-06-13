import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { ROUTES } from '@/lib/routes'
import { getAppOrigin } from '@/lib/env/app-origin'
import { requireCrmAdmin } from '@/lib/crm/require-crm-admin'
import {
  buildHubSpotAuthorizeUrl,
  createHubSpotOAuthState,
  HUBSPOT_OAUTH_STATE_COOKIE,
} from '@/lib/crm/hubspot/oauth'
import { isHubSpotConfigured } from '@/lib/crm/hubspot/config'

export async function GET() {
  try {
    const guard = await requireCrmAdmin()
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status })
    }

    if (!isHubSpotConfigured()) {
      return NextResponse.json(
        { error: 'HubSpot ist nicht konfiguriert (HUBSPOT_CLIENT_ID / HUBSPOT_CLIENT_SECRET).' },
        { status: 503 }
      )
    }

    const state = createHubSpotOAuthState()
    const authorizeUrl = buildHubSpotAuthorizeUrl(state)
    if (!authorizeUrl) {
      return NextResponse.json({ error: 'HubSpot OAuth-URL konnte nicht erzeugt werden.' }, { status: 500 })
    }

    const cookieStore = await cookies()
    cookieStore.set(HUBSPOT_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })

    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    console.error('[hubspot/connect]', error)
    return NextResponse.redirect(
      `${getAppOrigin()}${ROUTES.accounts}?crm_connected=error&crm_provider=hubspot`
    )
  }
}

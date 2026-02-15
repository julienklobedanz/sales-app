import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // --- URL ERMITTLUNG (ROBUST) ---
  // 1. Priorität: Ihre gesetzte Variable
  let origin = process.env.NEXT_PUBLIC_APP_URL

  // 2. Priorität: Automatische Vercel URL (falls Variable vergessen wurde)
  if (!origin && process.env.VERCEL_URL) {
    origin = `https://${process.env.VERCEL_URL}`
  }

  // 3. Fallback: Request Origin (nicht immer verlässlich hinter Proxies)
  if (!origin) {
    origin = requestUrl.origin
  }

  // Sanitize: Leerzeichen weg, Slash am Ende weg
  origin = origin.trim().replace(/\/$/, '')

  // Protokoll erzwingen (WICHTIG für Vercel!)
  if (!origin.startsWith('http')) {
    origin = `https://${origin}`
  }

  console.log('[Callback] Redirect Origin:', origin) // Zum Debuggen in Vercel Logs

  if (code) {
    // URL sicher zusammenbauen
    const redirectTo = new URL(next, origin)

    // Response vorbereiten
    const response = NextResponse.redirect(redirectTo)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
    } else {
      console.error('[Callback] Auth Error:', error.message)
    }
  }

  // Fehlerfall: Zurück zum Login
  // Auch hier nutzen wir die sichere Origin
  return NextResponse.redirect(`${origin}/login?error=auth`)
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROUTES } from '@/lib/routes'

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? ROUTES.home

  // 1. Origin holen & säubern
  let origin = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin
  origin = origin.trim().replace(/\/$/, '') // Leerzeichen & Slash am Ende weg

  // 2. Protokoll erzwingen (falls https:// in der Variable fehlt)
  if (!origin.startsWith('http')) {
    origin = `https://${origin}`
  }

  // 3. SICHERE URL ERSTELLUNG
  // new URL() verhindert den Absturz, den du gerade hast
  const redirectTo = new URL(next, origin)

  if (code) {
    const cookieStore = request.cookies

    // Response mit der sicheren URL erstellen
    const response = NextResponse.redirect(redirectTo)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
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
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile?.organization_id) {
          const onboardingUrl = new URL(ROUTES.onboarding, origin)
          response.headers.set('Location', onboardingUrl.toString())
        }
      }
      return response
    }
  }

  // Fehlerfall: Zurück zum Login (auch hier sicher gebaut)
  const errorUrl = new URL(ROUTES.login, origin)
  errorUrl.searchParams.set('error', 'auth')
  return NextResponse.redirect(errorUrl)
}

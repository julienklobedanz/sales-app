import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Wir nutzen request.nextUrl, das ist in Next.js stabiler
  const requestUrl = request.nextUrl
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Auch hier: Sicherstellen, dass wir auf der richtigen Domain bleiben
  const origin = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
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
      // Erfolg: Weiterleiten zur echten URL
      return response
    }
  }

  // Fehler: Zurück zum Login
  return NextResponse.redirect(`${origin}/login?error=auth`)
}

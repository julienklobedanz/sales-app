import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // 1. Origin bestimmen: Zuerst Env Var, dann Request Origin
  let origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || requestUrl.origin

  // 2. Sicherheits-Check: Protokoll erzwingen (falls "sales-app..." statt "https://sales-app..." eingetragen wurde)
  if (!origin.startsWith('http')) {
    origin = `https://${origin}`
  }
  // Trailing Slash entfernen, falls vorhanden
  origin = origin.replace(/\/$/, '')

  // 3. Ziel-URL sicher zusammenbauen
  // new URL() verhindert "invalid path" Fehler bei Slash-Konflikten
  const redirectTo = new URL(next, origin)

  if (code) {
    const cookieStore = request.cookies

    // Response mit Redirect vorbereiten
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
      return response
    }
  }

  // Fehlerfall: Login mit Error-Parameter
  const errorUrl = new URL('/login', origin)
  errorUrl.searchParams.set('error', 'auth')
  return NextResponse.redirect(errorUrl)
}

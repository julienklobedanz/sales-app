import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROUTES } from '@/lib/routes'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute =
    request.nextUrl.pathname.startsWith(ROUTES.login) ||
    request.nextUrl.pathname.startsWith(ROUTES.register) ||
    request.nextUrl.pathname.startsWith(ROUTES.forgotPassword) ||
    request.nextUrl.pathname.startsWith(ROUTES.auth) ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith(ROUTES.onboarding) ||
    request.nextUrl.pathname.startsWith(ROUTES.approvalPrefix) ||
    request.nextUrl.pathname.startsWith('/p/')

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.login
    return NextResponse.redirect(url)
  }

  const invite = request.nextUrl.searchParams.get('invite')
  if (
    invite &&
    (request.nextUrl.pathname === ROUTES.register ||
      request.nextUrl.pathname === ROUTES.login)
  ) {
    supabaseResponse.cookies.set('invite_token', invite, {
      path: '/',
      maxAge: 86400,
      httpOnly: true,
      sameSite: 'lax',
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

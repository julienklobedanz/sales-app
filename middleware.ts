import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROUTES } from '@/lib/routes'

type WindowLimit = { count: number; resetAt: number }
type RateStore = Map<string, WindowLimit>

function getRateStore(): RateStore {
  const g = globalThis as unknown as { __refstackEdgeRateStore?: RateStore }
  if (!g.__refstackEdgeRateStore) g.__refstackEdgeRateStore = new Map<string, WindowLimit>()
  return g.__refstackEdgeRateStore
}

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const real = request.headers.get('x-real-ip')?.trim()
  return fwd || real || 'unknown'
}

function hitLimit(key: string, max: number, windowMs: number): { limited: boolean; remaining: number } {
  const store = getRateStore()
  const now = Date.now()
  const prev = store.get(key)
  if (!prev || prev.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { limited: false, remaining: max - 1 }
  }
  prev.count += 1
  store.set(key, prev)
  return { limited: prev.count > max, remaining: Math.max(0, max - prev.count) }
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/p/')) {
    const ip = getClientIp(request)
    const isPost = request.method === 'POST'
    const max = isPost ? 20 : 180
    const windowMs = isPost ? 15 * 60 * 1000 : 60 * 1000
    const key = `p:${request.nextUrl.pathname}:${request.method}:${ip}`
    const status = hitLimit(key, max, windowMs)
    if (status.limited) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': isPost ? '900' : '60',
          'X-RateLimit-Policy': isPost ? 'public-link-post-20/15m' : 'public-link-get-180/1m',
          'X-RateLimit-Remaining': '0',
        },
      })
    }
  }

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
    request.nextUrl.pathname.startsWith(ROUTES.internalApprovalPrefix) ||
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

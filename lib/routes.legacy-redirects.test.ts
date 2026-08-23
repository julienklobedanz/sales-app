import { describe, expect, it } from 'vitest'

import { LEGACY_REDIRECTS, ROUTES } from '@/lib/routes'

/**
 * Next wertet `redirects()` in Array-Reihenfolge aus (erstes Treffer gewinnt).
 * Gleiche Semantik hier: `:param` ein Segment, `:param*` der Rest (auch leer).
 */
function matchSource(
  source: string,
  pathname: string,
): Record<string, string> | null {
  const sourceParts = source.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  const params: Record<string, string> = {}
  let si = 0
  let pi = 0
  while (si < sourceParts.length) {
    const segment = sourceParts[si]
    const splat = /^:(\w+)\*$/.exec(segment)
    const named = /^:(\w+)$/.exec(segment)
    if (splat) {
      params[splat[1]] = pathParts.slice(pi).join('/')
      return params
    }
    if (pi >= pathParts.length) return null
    if (named) {
      params[named[1]] = pathParts[pi]
    } else if (segment !== pathParts[pi]) {
      return null
    }
    si += 1
    pi += 1
  }
  if (pi !== pathParts.length) return null
  return params
}

function applyDestination(
  destination: string,
  params: Record<string, string>,
): string {
  let out = destination
  for (const [key, value] of Object.entries(params)) {
    out = out.replaceAll(`:${key}*`, value)
    out = out.replaceAll(`:${key}`, value)
  }
  out = out.replace(/\/{2,}/g, '/')
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1)
  return out || '/'
}

function firstRedirect(pathname: string): string | null {
  for (const rule of LEGACY_REDIRECTS) {
    const params = matchSource(rule.source, pathname)
    if (params) return applyDestination(rule.destination, params)
  }
  return null
}

describe('LEGACY_REDIRECTS order', () => {
  it('lands specific aliases before the /dashboard catch-all', () => {
    expect(firstRedirect('/dashboard/evidence')).toBe('/references')
    expect(firstRedirect('/dashboard/evidence/x')).toBe('/references/x')
    expect(firstRedirect('/dashboard/companies')).toBe('/accounts')
    expect(firstRedirect('/dashboard/new')).toBe(ROUTES.references.new)
    expect(firstRedirect('/dashboard/edit/abc')).toBe('/references/abc/edit')
    expect(firstRedirect('/dashboard/request')).toBe(ROUTES.request)
    expect(firstRedirect('/dashboard/market-signals/manage')).toBe(
      ROUTES.marketSignalsManage,
    )
    expect(firstRedirect('/dashboard/references')).toBe('/references')
    expect(firstRedirect('/dashboard/deals/1/ausschreibung')).toBe(
      '/deals/1/ausschreibung',
    )
    expect(firstRedirect('/dashboard')).toBe('/')
  })

  it('keeps every destination free of /dashboard', () => {
    for (const rule of LEGACY_REDIRECTS) {
      expect(rule.destination, rule.source).not.toContain('/dashboard')
    }
  })
})

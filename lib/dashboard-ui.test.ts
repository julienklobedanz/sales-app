import { describe, expect, it } from 'vitest'
import {
  detailRouteNeedsBottomPadding,
  routeExcludesDashboardContentPadding,
} from './dashboard-ui'
import { ROUTES } from './routes'

describe('routeExcludesDashboardContentPadding', () => {
  it('bleed layout for new deal and new evidence', () => {
    expect(routeExcludesDashboardContentPadding('/dashboard/deals/new')).toBe(true)
    expect(routeExcludesDashboardContentPadding(ROUTES.evidence.new)).toBe(true)
  })

  it('bleed layout for account detail only, not list', () => {
    expect(routeExcludesDashboardContentPadding('/dashboard/accounts')).toBe(false)
    expect(routeExcludesDashboardContentPadding('/dashboard/accounts/uuid-here')).toBe(true)
  })

  it('default padded layout for other dashboard routes', () => {
    expect(routeExcludesDashboardContentPadding(ROUTES.evidence.root)).toBe(false)
    expect(routeExcludesDashboardContentPadding('/dashboard/deals')).toBe(false)
    expect(routeExcludesDashboardContentPadding(null)).toBe(false)
  })
})

describe('detailRouteNeedsBottomPadding', () => {
  it('true for evidence and deal detail, not new/list', () => {
    expect(detailRouteNeedsBottomPadding(ROUTES.evidence.detail('abc'))).toBe(true)
    expect(detailRouteNeedsBottomPadding(ROUTES.evidence.edit('abc'))).toBe(true)
    expect(detailRouteNeedsBottomPadding(ROUTES.evidence.new)).toBe(false)
    expect(detailRouteNeedsBottomPadding(ROUTES.evidence.root)).toBe(false)
  })

  it('true for deal detail, false for request/new', () => {
    expect(detailRouteNeedsBottomPadding('/dashboard/deals/abc')).toBe(true)
    expect(detailRouteNeedsBottomPadding('/dashboard/deals/new')).toBe(false)
    expect(detailRouteNeedsBottomPadding('/dashboard/deals/request/new')).toBe(false)
  })

  it('false outside dashboard', () => {
    expect(detailRouteNeedsBottomPadding('/login')).toBe(false)
    expect(detailRouteNeedsBottomPadding(null)).toBe(false)
  })
})

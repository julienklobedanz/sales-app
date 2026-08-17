import { describe, expect, it } from 'vitest'
import {
  detailRouteNeedsBottomPadding,
  routeExcludesDashboardContentPadding,
} from './dashboard-ui'
import { ROUTES } from './routes'

describe('routeExcludesDashboardContentPadding', () => {
  it('bleed layout for new deal and new evidence', () => {
    expect(routeExcludesDashboardContentPadding('/dashboard/deals/new')).toBe(true)
    expect(routeExcludesDashboardContentPadding(ROUTES.references.new)).toBe(true)
  })

  it('bleed layout for account detail only, not list', () => {
    expect(routeExcludesDashboardContentPadding('/dashboard/accounts')).toBe(false)
    expect(routeExcludesDashboardContentPadding('/dashboard/accounts/uuid-here')).toBe(
      true,
    )
  })

  it('default padded layout for other dashboard routes', () => {
    expect(routeExcludesDashboardContentPadding(ROUTES.references.root)).toBe(false)
    expect(routeExcludesDashboardContentPadding('/dashboard/deals')).toBe(false)
    expect(routeExcludesDashboardContentPadding(null)).toBe(false)
  })
})

describe('detailRouteNeedsBottomPadding', () => {
  it('true for evidence and deal detail, not new/list', () => {
    expect(detailRouteNeedsBottomPadding(ROUTES.references.detail('abc'))).toBe(false)
    expect(detailRouteNeedsBottomPadding(ROUTES.references.edit('abc'))).toBe(true)
    expect(detailRouteNeedsBottomPadding(ROUTES.references.new)).toBe(false)
    expect(detailRouteNeedsBottomPadding(ROUTES.references.root)).toBe(false)
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

import { describe, expect, it } from 'vitest'
import {
  detailRouteNeedsBottomPadding,
  routeExcludesDashboardContentPadding,
} from './dashboard-ui'
import { ROUTES } from './routes'

describe('routeExcludesDashboardContentPadding', () => {
  it('bleed layout for new deal and new evidence', () => {
    expect(routeExcludesDashboardContentPadding('/deals/new')).toBe(true)
    expect(routeExcludesDashboardContentPadding(ROUTES.references.new)).toBe(true)
  })

  it('bleed layout for account detail only, not list', () => {
    expect(routeExcludesDashboardContentPadding('/accounts')).toBe(false)
    expect(routeExcludesDashboardContentPadding('/accounts/uuid-here')).toBe(
      true,
    )
  })

  it('bleed layout for deal workspace so the rail can fill the height', () => {
    expect(
      routeExcludesDashboardContentPadding('/deals/abc/arbeitsbereich'),
    ).toBe(true)
    expect(
      routeExcludesDashboardContentPadding(
        '/deals/abc/arbeitsbereich/dokumente',
      ),
    ).toBe(true)
    expect(routeExcludesDashboardContentPadding('/deals/abc')).toBe(false)
  })

  it('default padded layout for other dashboard routes', () => {
    expect(routeExcludesDashboardContentPadding(ROUTES.references.root)).toBe(false)
    expect(routeExcludesDashboardContentPadding('/deals')).toBe(false)
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

  it('true for deal detail, false for workspace/request/new', () => {
    expect(detailRouteNeedsBottomPadding('/deals/abc')).toBe(true)
    expect(detailRouteNeedsBottomPadding('/deals/abc/arbeitsbereich')).toBe(
      false,
    )
    expect(detailRouteNeedsBottomPadding('/ausschreibungen/abc')).toBe(true)
    expect(detailRouteNeedsBottomPadding('/deals/new')).toBe(false)
    expect(detailRouteNeedsBottomPadding('/deals/request/new')).toBe(false)
  })

  it('false outside dashboard', () => {
    expect(detailRouteNeedsBottomPadding('/login')).toBe(false)
    expect(detailRouteNeedsBottomPadding(null)).toBe(false)
  })
})

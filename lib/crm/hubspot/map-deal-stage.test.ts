import { describe, expect, it } from 'vitest'

import { mapHubSpotStageToDealStatus } from '@/lib/crm/hubspot/map-deal-stage'
import { dealHasCrmSync } from '@/lib/crm/deal-links'

describe('mapHubSpotStageToDealStatus', () => {
  it('maps closed won/lost', () => {
    expect(mapHubSpotStageToDealStatus('closedwon')).toBe('won')
    expect(mapHubSpotStageToDealStatus('closedlost')).toBe('lost')
  })

  it('maps negotiation and rfp stages', () => {
    expect(mapHubSpotStageToDealStatus('contractsent')).toBe('negotiation')
    expect(mapHubSpotStageToDealStatus('rfp_phase')).toBe('rfp')
  })

  it('defaults to open', () => {
    expect(mapHubSpotStageToDealStatus('qualifiedtobuy')).toBe('open')
    expect(mapHubSpotStageToDealStatus(null)).toBe('open')
  })
})

describe('dealHasCrmSync', () => {
  it('detects generic crm opportunity ids', () => {
    expect(
      dealHasCrmSync({
        crm_source: 'hubspot',
        crm_opportunity_id: '123',
      })
    ).toBe(true)
  })
})

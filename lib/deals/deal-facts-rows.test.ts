import { describe, expect, it } from 'vitest'

import { formatCrmStageLabel } from '@/lib/crm/format-crm-stage-label'
import { buildDealFactRows } from '@/lib/deals/deal-facts-rows'

describe('formatCrmStageLabel', () => {
  it('maps known HubSpot stage ids', () => {
    expect(formatCrmStageLabel('closedwon')).toBe('Gewonnen')
    expect(formatCrmStageLabel('appointmentscheduled')).toBe('Termin geplant')
  })

  it('humanizes snake_case stages', () => {
    expect(formatCrmStageLabel('proposal_sent')).toBe('Proposal Sent')
  })
})

describe('buildDealFactRows', () => {
  const base = {
    company_name: 'Apple',
    industry: 'tech',
    volume: '1.200.000 €',
    expiry_date: '2026-04-18',
    account_manager_name: 'Marc AM',
    sales_manager_name: 'Sam Sales',
  }

  it('formats close date with org preset', () => {
    const rows = buildDealFactRows(base, { dateDisplayFormat: 'de-DE' })
    const close = rows.find((r) => r.label === 'Close')
    expect(close?.kind).toBe('text')
    if (close?.kind === 'text') expect(close.value).toBe('18.04.2026')
  })

  it('omits CRM rows without CRM sync', () => {
    const rows = buildDealFactRows(base)
    expect(rows.some((r) => r.label === 'CRM-Stage')).toBe(false)
    expect(rows.some((r) => r.label === 'Opportunity')).toBe(false)
    expect(rows.find((r) => r.label === 'Owner')).toBeUndefined()
  })

  it('adds stage and HubSpot link when CRM-synced', () => {
    const rows = buildDealFactRows(
      {
        ...base,
        crm_source: 'hubspot',
        crm_opportunity_id: '12345',
        crm_stage: 'qualifiedtobuy',
      },
      { hubspotPortalId: '999' },
    )
    const stage = rows.find((r) => r.kind === 'text' && r.label === 'CRM-Stage')
    expect(stage?.kind === 'text' ? stage.value : undefined).toBe('Qualifiziert')
    const link = rows.find((r) => r.kind === 'link')
    expect(link?.href).toContain('12345')
  })
})

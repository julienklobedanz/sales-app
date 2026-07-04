import { describe, expect, it } from 'vitest'

import { mergeWorkflowSettings } from '@/lib/organizations/workflow-settings-merge'

describe('mergeWorkflowSettings', () => {
  it('preserves existing keys when patching capabilityProfile', () => {
    const current = {
      link_expiry_days: 14,
      icpDefinition: { industry: 'SaaS' },
    }
    const merged = mergeWorkflowSettings(current, {
      capabilityProfile: { employeeCount: 120 },
    })
    expect(merged.link_expiry_days).toBe(14)
    expect(merged.icpDefinition).toEqual({ industry: 'SaaS' })
    expect(merged.capabilityProfile).toEqual({ employeeCount: 120 })
  })

  it('preserves capabilityProfile when patching icpDefinition', () => {
    const current = {
      capabilityProfile: { employeeCount: 500 },
      approval_reminder_1_days: 3,
    }
    const merged = mergeWorkflowSettings(current, {
      icpDefinition: { region: 'DACH' },
    })
    expect(merged.capabilityProfile).toEqual({ employeeCount: 500 })
    expect(merged.approval_reminder_1_days).toBe(3)
    expect(merged.icpDefinition).toEqual({ region: 'DACH' })
  })

  it('handles null/invalid current as empty object base', () => {
    const merged = mergeWorkflowSettings(null, {
      capabilityProfile: { annualRevenueEur: 50_000_000 },
    })
    expect(merged.capabilityProfile).toEqual({ annualRevenueEur: 50_000_000 })
  })
})

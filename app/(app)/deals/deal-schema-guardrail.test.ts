import { describe, expect, it } from 'vitest'

import { EMPTY_RESOLVED_DEADLINE } from '@/lib/deals/resolve-deal-deadline'
import {
  DEAL_ROW_DERIVED_FIELDS,
  DEAL_TABLE_ALLOWED_COLUMNS,
  type DealRow,
} from '@/app/(app)/deals/types'

describe('deal schema guardrail (F2)', () => {
  it('DealRow core fields stay within allowed DB columns + documented derived fields', () => {
    const sample: DealRow = {
      id: '1',
      title: 'Deal',
      company_id: null,
      company_name: null,
      industry: null,
      volume: null,
      incumbent_provider: null,
      is_public: false,
      account_manager_id: null,
      account_manager_name: null,
      sales_manager_id: null,
      sales_manager_name: null,
      status: 'open',
      is_rfp_mode: false,
      tender_id: null,
      tender: null,
      expiry_date: null,
      deadline: EMPTY_RESOLVED_DEADLINE,
      created_at: new Date().toISOString(),
      updated_at: null,
      best_match_score: null,
    }

    const rowKeys = Object.keys(sample)
    const forbiddenCrmFields = [
      'forecast_amount',
      'forecast_probability',
      'activity_log',
      'contact_ids',
      'last_activity_at',
    ]

    for (const forbidden of forbiddenCrmFields) {
      expect(rowKeys).not.toContain(forbidden)
      expect(DEAL_TABLE_ALLOWED_COLUMNS as readonly string[]).not.toContain(forbidden)
    }

    const allowed = new Set<string>([
      ...DEAL_TABLE_ALLOWED_COLUMNS,
      ...DEAL_ROW_DERIVED_FIELDS,
      'requirements_text',
      'linked_refs',
      'company_logo_url',
    ])

    for (const key of rowKeys) {
      expect(allowed.has(key), `unexpected DealRow field: ${key}`).toBe(true)
    }
  })
})

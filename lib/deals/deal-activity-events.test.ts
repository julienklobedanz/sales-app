import { describe, expect, it } from 'vitest'

import {
  DEAL_ACTIVITY_VISIBLE_EVENT_TYPES,
  mapEvidenceEventsToDealActivities,
  sortDealActivitiesNewestFirst,
} from '@/lib/deals/deal-activity-events'

describe('deal activity events', () => {
  it('excludes reference_matched from user-facing timeline', () => {
    const rows = mapEvidenceEventsToDealActivities([
      {
        id: '1',
        event_type: 'reference_matched',
        payload: { comment: 'deal_context' },
        created_at: '2024-07-08T10:00:00Z',
      },
      {
        id: '2',
        event_type: 'deal_won',
        payload: { comment: 'Gewonnen nach POC' },
        created_at: '2024-07-09T10:00:00Z',
      },
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]?.title).toBe('Deal gewonnen')
    expect(rows[0]?.detail).toBe('Gewonnen nach POC')
  })

  it('maps reference_helped with helped flag', () => {
    const [helped, notHelped] = mapEvidenceEventsToDealActivities([
      {
        id: 'a',
        event_type: 'reference_helped',
        payload: { helped: true },
        created_at: '2024-07-08T10:00:00Z',
      },
      {
        id: 'b',
        event_type: 'reference_helped',
        payload: { helped: false },
        created_at: '2024-07-08T11:00:00Z',
      },
    ])

    expect(helped?.title).toBe('Referenz hat geholfen')
    expect(notHelped?.title).toBe('Referenz hat nicht geholfen')
  })

  it('whitelist stays minimal for deal cockpit', () => {
    expect(DEAL_ACTIVITY_VISIBLE_EVENT_TYPES).toEqual([
      'deal_won',
      'deal_lost',
      'deal_withdrawn',
      'reference_helped',
    ])
  })

  it('sorts activities newest first', () => {
    const sorted = sortDealActivitiesNewestFirst([
      {
        id: 'old',
        at: new Date('2024-01-01T10:00:00Z'),
        title: 'Deal erstellt',
        detail: '',
      },
      {
        id: 'new',
        at: new Date('2024-06-01T10:00:00Z'),
        title: 'Deal gewonnen',
        detail: '',
      },
    ])

    expect(sorted.map((a) => a.id)).toEqual(['new', 'old'])
  })
})

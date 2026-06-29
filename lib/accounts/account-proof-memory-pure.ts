export type AccountProofImpactRow = {
  referenceId: string
  title: string
  dealCount: number
  wonDealCount: number
  viewCount: number
  decisiveCount: number
}

export type AccountProofHistoryItem = {
  id: string
  at: string
  label: string
  detail: string | null
  referenceId: string | null
  dealId: string | null
}

export type AccountProofLastWon = {
  dealTitle: string
  referenceTitle: string
  at: string
}

export type AccountProofMemory = {
  impact: AccountProofImpactRow[]
  history: AccountProofHistoryItem[]
  lastWonWithProof: AccountProofLastWon | null
}

type DealRow = {
  id: string
  title: string
  status: string
  decisive_reference_id: string | null
  updated_at: string | null
  account_manager_id?: string | null
}

type DealReferenceRow = {
  deal_id: string
  reference_id: string
}

type EvidenceEventRow = {
  id: string
  created_at: string
  event_type: string
  deal_id: string | null
  reference_id: string | null
  payload: unknown
}

export function impactSortScore(row: AccountProofImpactRow): number {
  return row.decisiveCount * 1000 + row.wonDealCount * 100 + row.viewCount * 10 + row.dealCount
}

export function buildAccountProofMemory(input: {
  deals: DealRow[]
  dealReferences: DealReferenceRow[]
  events: EvidenceEventRow[]
  visibleRefIds: ReadonlySet<string>
  refTitleById: ReadonlyMap<string, string>
  dealTitleById: ReadonlyMap<string, string>
}): AccountProofMemory {
  const { deals, dealReferences, events, visibleRefIds, refTitleById, dealTitleById } = input

  if (!deals.length) {
    return { impact: [], history: [], lastWonWithProof: null }
  }

  const dealIds = new Set(deals.map((d) => d.id))
  const impactMap = new Map<string, AccountProofImpactRow>()

  const ensureImpact = (referenceId: string): AccountProofImpactRow | null => {
    if (!visibleRefIds.has(referenceId)) return null
    let row = impactMap.get(referenceId)
    if (!row) {
      row = {
        referenceId,
        title: refTitleById.get(referenceId) ?? '—',
        dealCount: 0,
        wonDealCount: 0,
        viewCount: 0,
        decisiveCount: 0,
      }
      impactMap.set(referenceId, row)
    }
    return row
  }

  const dealsPerRef = new Map<string, Set<string>>()
  const wonDealsPerRef = new Map<string, Set<string>>()

  for (const link of dealReferences) {
    if (!dealIds.has(link.deal_id) || !visibleRefIds.has(link.reference_id)) continue
    if (!dealsPerRef.has(link.reference_id)) dealsPerRef.set(link.reference_id, new Set())
    dealsPerRef.get(link.reference_id)!.add(link.deal_id)
  }

  for (const deal of deals) {
    if (deal.status !== 'won') continue
    for (const [refId, dealSet] of dealsPerRef) {
      if (dealSet.has(deal.id)) {
        if (!wonDealsPerRef.has(refId)) wonDealsPerRef.set(refId, new Set())
        wonDealsPerRef.get(refId)!.add(deal.id)
      }
    }
    if (deal.decisive_reference_id && visibleRefIds.has(deal.decisive_reference_id)) {
      const row = ensureImpact(deal.decisive_reference_id)
      if (row) row.decisiveCount += 1
    }
  }

  for (const [refId, dealSet] of dealsPerRef) {
    const row = ensureImpact(refId)
    if (!row) continue
    row.dealCount = dealSet.size
    row.wonDealCount = wonDealsPerRef.get(refId)?.size ?? 0
  }

  const history: AccountProofHistoryItem[] = []
  let lastWonWithProof: AccountProofLastWon | null = null

  for (const event of events) {
    const eventType = String(event.event_type ?? '')
    const refId = event.reference_id
    const dealId = event.deal_id
    const dealTitle = dealId ? (dealTitleById.get(dealId) ?? 'Deal') : null

    if (eventType === 'share_link_viewed') {
      if (!refId || !visibleRefIds.has(refId)) continue
      const row = ensureImpact(refId)
      if (row) row.viewCount += 1
      history.push({
        id: event.id,
        at: event.created_at,
        label: `„${refTitleById.get(refId) ?? 'Referenz'}" geöffnet`,
        detail: dealTitle ? `Kontext: ${dealTitle}` : null,
        referenceId: refId,
        dealId,
      })
      continue
    }

    if (dealId && !dealIds.has(dealId)) continue

    if (eventType === 'reference_shared') {
      if (refId && !visibleRefIds.has(refId)) continue
      history.push({
        id: event.id,
        at: event.created_at,
        label: refId
          ? `„${refTitleById.get(refId) ?? 'Referenz'}" geteilt`
          : 'Referenz geteilt',
        detail: dealTitle ? `Deal: ${dealTitle}` : null,
        referenceId: refId,
        dealId,
      })
      continue
    }

    if (eventType === 'deal_won' || eventType === 'deal_lost') {
      const payload =
        event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
          ? (event.payload as Record<string, unknown>)
          : {}
      const decisiveId =
        (typeof payload.decisive_reference_id === 'string' ? payload.decisive_reference_id : null) ??
        refId
      const outcomeReason =
        typeof payload.outcome_reason === 'string' ? payload.outcome_reason.trim() : ''

      if (decisiveId && !visibleRefIds.has(decisiveId)) {
        history.push({
          id: event.id,
          at: event.created_at,
          label:
            eventType === 'deal_won'
              ? `Deal „${dealTitle ?? '—'}" gewonnen`
              : `Deal „${dealTitle ?? '—'}" verloren`,
          detail: outcomeReason || null,
          referenceId: null,
          dealId,
        })
        continue
      }

      const refTitle = decisiveId ? refTitleById.get(decisiveId) : null
      history.push({
        id: event.id,
        at: event.created_at,
        label:
          eventType === 'deal_won'
            ? `Deal „${dealTitle ?? '—'}" gewonnen`
            : `Deal „${dealTitle ?? '—'}" verloren`,
        detail: refTitle
          ? `Entscheidend: ${refTitle}${outcomeReason ? ` — ${outcomeReason}` : ''}`
          : outcomeReason || null,
        referenceId: decisiveId,
        dealId,
      })

      if (eventType === 'deal_won' && decisiveId && refTitle) {
        const candidate: AccountProofLastWon = {
          dealTitle: dealTitle ?? '—',
          referenceTitle: refTitle,
          at: event.created_at,
        }
        if (!lastWonWithProof || candidate.at > lastWonWithProof.at) {
          lastWonWithProof = candidate
        }
      }
    }
  }

  for (const deal of deals) {
    if (deal.status !== 'won' || !deal.decisive_reference_id) continue
    if (!visibleRefIds.has(deal.decisive_reference_id)) continue
    const refTitle = refTitleById.get(deal.decisive_reference_id)
    if (!refTitle) continue
    const at = deal.updated_at ?? ''
    if (!at) continue
    const candidate: AccountProofLastWon = {
      dealTitle: deal.title,
      referenceTitle: refTitle,
      at,
    }
    if (!lastWonWithProof || candidate.at > lastWonWithProof.at) {
      lastWonWithProof = candidate
    }
  }

  const impact = Array.from(impactMap.values()).sort(
    (a, b) => impactSortScore(b) - impactSortScore(a)
  )

  history.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

  return {
    impact,
    history: history.slice(0, 80),
    lastWonWithProof,
  }
}

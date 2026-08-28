import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DealProofIndicator } from '@/components/dashboard/deal-proof-indicator'
import { proofDisplayFromCounts } from '@/lib/deals/deal-proof-display'

describe('DealProofIndicator', () => {
  it('setzt ohne interactive keinen tabIndex', () => {
    const { container: empty } = render(
      <DealProofIndicator display={proofDisplayFromCounts(0, null)} interactive={false} />,
    )
    expect(empty.querySelectorAll('[tabindex]')).toHaveLength(0)

    const { container: countOnly } = render(
      <DealProofIndicator display={proofDisplayFromCounts(2, null)} interactive={false} />,
    )
    expect(countOnly.querySelectorAll('[tabindex]')).toHaveLength(0)

    const { container: scored } = render(
      <DealProofIndicator
        display={proofDisplayFromCounts(1, 0.82)}
        interactive={false}
      />,
    )
    expect(scored.querySelectorAll('[tabindex]')).toHaveLength(0)
  })
})

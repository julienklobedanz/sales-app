export const dynamic = 'force-dynamic'

import { MarketSignalsClient } from './market-signals-client'
import { loadMarketSignalsPageData } from './data'

export default async function MarketSignalsPage() {
  const model = await loadMarketSignalsPageData()
  return <MarketSignalsClient model={model} />
}

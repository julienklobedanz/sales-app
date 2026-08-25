'use client'

import { COPY } from '@/lib/copy'
import { DEAL_WORKSPACE_ENTRY_PARAM } from '@/lib/deals/deal-workspace-areas'
import { useCollectionObjectSelection } from '@/lib/dashboard/use-collection-object-selection'
import type { DealRfpRequirementRow } from '@/lib/deals/load-deal-rfp-requirements'

import { DealEntryPanel } from './deal-entry-panel'

export function DealRequirementsEntryPanel({
  requirements,
}: {
  requirements: DealRfpRequirementRow[]
}) {
  const { selected } = useCollectionObjectSelection({
    items: requirements,
    paramKey: DEAL_WORKSPACE_ENTRY_PARAM,
    autoSelect: false,
  })

  return (
    <DealEntryPanel host="workspace">
      {!selected ? (
        <p className="text-sm text-muted-foreground">
          {COPY.deals.cockpit.entryPanelEmpty}
        </p>
      ) : (
        <div className="space-y-3">
          {selected.category ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {selected.category}
            </p>
          ) : null}
          <h2 className="text-base font-semibold">{selected.text}</h2>
          <p className="text-sm text-muted-foreground">
            {COPY.deals.cockpit.requirementsSource}:{' '}
            {selected.sourceFileName ?? COPY.deals.cockpit.requirementsSourceUnknown}
          </p>
        </div>
      )}
    </DealEntryPanel>
  )
}

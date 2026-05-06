import { CompanyDetailContactsTab } from './company-detail-contacts-tab'
import { CompanyDetailStakeholdersTab } from './company-detail-stakeholders-tab'
import type { ContactPersonRow, ExternalContactRow, StakeholderRow } from './actions'
import type { CompanyDetailClientProps } from './company-detail-types'

export function CompanyDetailPowerMapTab({
  stakeholders,
  marketSignals,
  internalContacts,
  externalContacts,
  canEdit,
  onAddStakeholder,
  onEditStakeholder,
  onRemoveStakeholder,
  onAddInternalContact,
  onEditInternalContact,
  onRemoveInternalContact,
}: {
  stakeholders: StakeholderRow[]
  marketSignals: CompanyDetailClientProps['marketSignals']
  internalContacts: ContactPersonRow[]
  externalContacts: ExternalContactRow[]
  canEdit: boolean
  onAddStakeholder: () => void
  onEditStakeholder: (s: StakeholderRow) => void
  onRemoveStakeholder: (id: string) => void
  onAddInternalContact: () => void
  onEditInternalContact: (c: ContactPersonRow) => void
  onRemoveInternalContact: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Power Map</h2>
        <p className="text-sm text-muted-foreground">
          Buying Center: Rollen, Einfluss und Interaktionsstatus im Überblick.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CompanyDetailStakeholdersTab
          stakeholders={stakeholders}
          marketSignals={marketSignals}
          canEdit={canEdit}
          onAdd={onAddStakeholder}
          onEdit={onEditStakeholder}
          onRemove={onRemoveStakeholder}
        />
        <CompanyDetailContactsTab
          internalContacts={internalContacts}
          externalContacts={externalContacts}
          canEdit={canEdit}
          onAdd={onAddInternalContact}
          onEdit={onEditInternalContact}
          onRemove={onRemoveInternalContact}
        />
      </div>
    </div>
  )
}


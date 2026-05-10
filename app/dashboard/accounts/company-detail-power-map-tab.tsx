import { CompanyDetailContactsTab } from './company-detail-contacts-tab'
import { CompanyDetailMarketSignalsCard } from './company-detail-market-signals-card'
import { CompanyDetailStakeholdersTab } from './company-detail-stakeholders-tab'
import type { ContactPersonRow, ExternalContactRow, StakeholderRow } from './actions'
import type { CompanyDetailClientProps } from './company-detail-types'

export function CompanyDetailPowerMapTab({
  stakeholders,
  marketSignals,
  internalContacts,
  externalContacts,
  organizationName,
  internalReferenceApprovalContactId,
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
  organizationName: string | null
  internalReferenceApprovalContactId: string | null
  canEdit: boolean
  onAddStakeholder: () => void
  onEditStakeholder: (s: StakeholderRow) => void
  onRemoveStakeholder: (id: string) => void
  onAddInternalContact: () => void
  onEditInternalContact: (c: ContactPersonRow) => void
  onRemoveInternalContact: (id: string) => void
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <CompanyDetailStakeholdersTab
        stakeholders={stakeholders}
        canEdit={canEdit}
        onAdd={onAddStakeholder}
        onEdit={onEditStakeholder}
        onRemove={onRemoveStakeholder}
      />
      <CompanyDetailContactsTab
        internalContacts={internalContacts}
        externalContacts={externalContacts}
        organizationName={organizationName}
        internalReferenceApprovalContactId={internalReferenceApprovalContactId}
        canEdit={canEdit}
        onAdd={onAddInternalContact}
        onEdit={onEditInternalContact}
        onRemove={onRemoveInternalContact}
      />
      <CompanyDetailMarketSignalsCard marketSignals={marketSignals} />
    </div>
  )
}


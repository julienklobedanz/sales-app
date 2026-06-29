import { CompanyDetailContactsTab } from './company-detail-contacts-tab'
import { CompanyDetailStakeholdersTab } from './company-detail-stakeholders-tab'
import type { ContactPersonRow, ExternalContactRow, StakeholderRow } from './actions'

export function CompanyDetailBuyingCenterSection({
  stakeholders,
  internalContacts,
  externalContacts,
  companyName,
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
  internalContacts: ContactPersonRow[]
  externalContacts: ExternalContactRow[]
  companyName: string
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
        externalContacts={externalContacts}
        companyName={companyName}
        canEdit={canEdit}
        onAdd={onAddStakeholder}
        onEdit={onEditStakeholder}
        onRemove={onRemoveStakeholder}
      />
      <CompanyDetailContactsTab
        internalContacts={internalContacts}
        organizationName={organizationName}
        internalReferenceApprovalContactId={internalReferenceApprovalContactId}
        canEdit={canEdit}
        onAdd={onAddInternalContact}
        onEdit={onEditInternalContact}
        onRemove={onRemoveInternalContact}
      />
    </div>
  )
}

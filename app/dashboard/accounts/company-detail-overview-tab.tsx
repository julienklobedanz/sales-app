import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ContactPersonRow, ExternalContactRow, StakeholderRow } from './actions'
import type { CompanyDetailClientProps } from './company-detail-types'
import { CompanyDetailBuyingCenterSection } from './company-detail-buying-center-section'
import { CompanyDetailMarketSignalsCard } from './company-detail-market-signals-card'
import { CompanyDetailMeddpiccSection } from './company-detail-meddpicc-section'

type StrategyField = {
  key: string
  label: string
  value: string
  set: (v: string) => void
}

export function CompanyDetailOverviewTab({
  companyDescription,
  canEditStrategy,
  strategySaving,
  strategyFields,
  saveStrategy,
  stakeholders,
  internalContacts,
  externalContacts,
  companyName,
  organizationName,
  internalReferenceApprovalContactId,
  canEditBuyingCenter,
  marketSignals,
  onAddStakeholder,
  onEditStakeholder,
  onRemoveStakeholder,
  onAddInternalContact,
  onEditInternalContact,
  onRemoveInternalContact,
}: {
  companyDescription: string | null
  canEditStrategy: boolean
  strategySaving: boolean
  strategyFields: StrategyField[]
  saveStrategy: (opts?: { silent?: boolean }) => Promise<void>
  stakeholders: StakeholderRow[]
  internalContacts: ContactPersonRow[]
  externalContacts: ExternalContactRow[]
  companyName: string
  organizationName: string | null
  internalReferenceApprovalContactId: string | null
  canEditBuyingCenter: boolean
  marketSignals: CompanyDetailClientProps['marketSignals']
  onAddStakeholder: () => void
  onEditStakeholder: (s: StakeholderRow) => void
  onRemoveStakeholder: (id: string) => void
  onAddInternalContact: () => void
  onEditInternalContact: (c: ContactPersonRow) => void
  onRemoveInternalContact: (id: string) => void
}) {
  const description = companyDescription?.trim()

  return (
    <div className="space-y-6">
      {description ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Steckbrief</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <CompanyDetailMeddpiccSection
        canEdit={canEditStrategy}
        strategySaving={strategySaving}
        strategyFields={strategyFields}
        saveStrategy={saveStrategy}
      />

      <div className="space-y-4">
        <h2 className="text-base font-semibold tracking-tight">Buying Center</h2>
        <CompanyDetailBuyingCenterSection
        stakeholders={stakeholders}
        internalContacts={internalContacts}
        externalContacts={externalContacts}
        companyName={companyName}
        organizationName={organizationName}
        internalReferenceApprovalContactId={internalReferenceApprovalContactId}
        canEdit={canEditBuyingCenter}
        onAddStakeholder={onAddStakeholder}
        onEditStakeholder={onEditStakeholder}
        onRemoveStakeholder={onRemoveStakeholder}
        onAddInternalContact={onAddInternalContact}
        onEditInternalContact={onEditInternalContact}
        onRemoveInternalContact={onRemoveInternalContact}
      />
      </div>

      <CompanyDetailMarketSignalsCard marketSignals={marketSignals} />
    </div>
  )
}

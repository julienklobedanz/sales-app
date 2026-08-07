'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Award, Compass, Kanban, Users } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRole } from '@/hooks/useRole'
import { COPY } from '@/lib/copy'

import { AccountContactDialog } from './account-contact-dialog'
import {
  ACCOUNT_DETAIL_TAB_TRIGGER_CLASS,
  parseAccountDetailTab,
  type AccountDetailTab,
} from './account-detail-constants'
import { AccountDetailHeader } from './account-detail-header'
import { AccountDetailPipelineTab } from './account-detail-pipeline-tab'
import { AccountDetailPowerMapTab } from './account-detail-power-map-tab'
import { AccountDetailProofPointsTab } from './account-detail-proof-points-tab'
import { AccountDetailStrategyTab } from './account-detail-strategy-tab'
import type { AccountDetailClientProps } from './account-detail-types'
import { AccountStakeholderDialog } from './account-stakeholder-dialog'
import { EditAccountDialog } from './edit-account-dialog'
import { useAccountDetailBuyingCenter } from './use-account-detail-buying-center'
import { useAccountDetailStrategy } from './use-account-detail-strategy'

export function AccountDetailClient({
  company,
  organizationName,
  strategy: initialStrategy,
  stakeholders: initialStakeholders,
  internalContacts: initialInternalContacts,
  externalContacts: initialExternalContacts,
  references,
  activeDeals,
  hubspotPortalId = null,
  marketSignals,
  initialEditOpen,
  ndaAgreements,
}: AccountDetailClientProps) {
  const { isAdmin, isAccountManager, isSales } = useRole()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const canEditAccount = isAdmin || isAccountManager
  const canEditStrategy = isAdmin || isAccountManager || isSales
  const canEditBuyingCenter = isAdmin || isAccountManager || isSales

  const [activeTab, setActiveTab] = useState<AccountDetailTab>(
    parseAccountDetailTab(searchParams.get('tab')),
  )
  const [editAccountOpen, setEditAccountOpen] = useState(Boolean(initialEditOpen))

  const strategy = useAccountDetailStrategy({
    companyId: company.id,
    initialStrategy,
    canEdit: canEditStrategy,
  })

  const buyingCenter = useAccountDetailBuyingCenter({
    companyId: company.id,
    initialStakeholders,
    initialExternalContacts,
    initialInternalContacts,
    initialInternalRefApprovalContactId:
      company.internal_reference_approval_contact_id ?? null,
    canEdit: canEditBuyingCenter,
  })

  return (
    <div className="space-y-6">
      <AccountDetailHeader
        company={company}
        canEdit={canEditAccount}
        onEditClick={() => setEditAccountOpen(true)}
        ndaAgreements={ndaAgreements}
        openNdaOnMount={searchParams.get('openNda') === '1'}
      />

      <EditAccountDialog
        open={editAccountOpen}
        onOpenChange={setEditAccountOpen}
        company={company}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const next = parseAccountDetailTab(value)
          setActiveTab(next)
          const params = new URLSearchParams(searchParams.toString())
          params.set('tab', next)
          router.replace(`${pathname}?${params.toString()}`)
        }}
        className="w-full gap-6"
      >
        <TabsList className="mb-2 flex h-auto w-full gap-1 rounded-none border-0 bg-transparent p-0">
          <TabsTrigger
            value="mission_control"
            className={ACCOUNT_DETAIL_TAB_TRIGGER_CLASS}
          >
            <Compass className="size-4" />
            Strategie
          </TabsTrigger>
          <TabsTrigger value="buying_center" className={ACCOUNT_DETAIL_TAB_TRIGGER_CLASS}>
            <Users className="size-4" />
            {COPY.accounts.tabBuyingCenter}
          </TabsTrigger>
          <TabsTrigger value="pipeline" className={ACCOUNT_DETAIL_TAB_TRIGGER_CLASS}>
            <Kanban className="size-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="proof_points" className={ACCOUNT_DETAIL_TAB_TRIGGER_CLASS}>
            <Award className="size-4" />
            Passende Referenzen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mission_control" className="mt-2">
          <AccountDetailStrategyTab
            canEdit={canEditStrategy}
            strategySaving={strategy.strategySaving}
            strategyFields={strategy.strategyFields}
            saveStrategy={strategy.saveStrategy}
            stakeholders={buyingCenter.stakeholders}
            externalContacts={buyingCenter.externalContacts}
            marketSignals={marketSignals}
            onSetStakeholderRole={buyingCenter.setStakeholderRole}
            onSetExternalBuyingCenterRole={buyingCenter.setExternalBuyingCenterRole}
          />
        </TabsContent>

        <TabsContent value="buying_center" className="mt-2">
          <AccountDetailPowerMapTab
            stakeholders={buyingCenter.stakeholders}
            marketSignals={marketSignals}
            internalContacts={buyingCenter.internalContacts}
            externalContacts={buyingCenter.externalContacts}
            companyName={company.name}
            organizationName={organizationName}
            internalReferenceApprovalContactId={
              buyingCenter.internalRefApprovalContactId
            }
            canEdit={canEditBuyingCenter}
            onAddStakeholder={() => buyingCenter.openStakeholderDialog()}
            onEditStakeholder={buyingCenter.openStakeholderDialog}
            onRemoveStakeholder={buyingCenter.removeStakeholder}
            onAddInternalContact={() => buyingCenter.openContactDialog()}
            onEditInternalContact={buyingCenter.openContactDialog}
            onRemoveInternalContact={buyingCenter.removeContact}
          />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-2">
          <AccountDetailPipelineTab
            activeDeals={activeDeals}
            hubspotPortalId={hubspotPortalId}
          />
        </TabsContent>

        <TabsContent value="proof_points" className="mt-2">
          <AccountDetailProofPointsTab company={company} references={references} />
        </TabsContent>
      </Tabs>

      <AccountStakeholderDialog
        open={buyingCenter.stakeholderOpen}
        onOpenChange={buyingCenter.setStakeholderOpen}
        editing={!!buyingCenter.editingStakeholder}
        saving={buyingCenter.stakeholderSaving}
        shName={buyingCenter.shName}
        setShName={buyingCenter.setShName}
        shTitle={buyingCenter.shTitle}
        setShTitle={buyingCenter.setShTitle}
        shRole={buyingCenter.shRole}
        setShRole={buyingCenter.setShRole}
        shInfluence={buyingCenter.shInfluence}
        setShInfluence={buyingCenter.setShInfluence}
        shAttitude={buyingCenter.shAttitude}
        setShAttitude={buyingCenter.setShAttitude}
        shLinkedIn={buyingCenter.shLinkedIn}
        setShLinkedIn={buyingCenter.setShLinkedIn}
        shPriorities={buyingCenter.shPriorities}
        setShPriorities={buyingCenter.setShPriorities}
        shLastContact={buyingCenter.shLastContact}
        setShLastContact={buyingCenter.setShLastContact}
        shSentiment={buyingCenter.shSentiment}
        setShSentiment={buyingCenter.setShSentiment}
        shNotes={buyingCenter.shNotes}
        setShNotes={buyingCenter.setShNotes}
        onSave={buyingCenter.saveStakeholder}
      />

      <AccountContactDialog
        open={buyingCenter.contactOpen}
        onOpenChange={buyingCenter.setContactOpen}
        editing={!!buyingCenter.editingContact}
        saving={buyingCenter.contactSaving}
        companyName={company.name}
        cFirst={buyingCenter.cFirst}
        setCFirst={buyingCenter.setCFirst}
        cLast={buyingCenter.cLast}
        setCLast={buyingCenter.setCLast}
        cEmail={buyingCenter.cEmail}
        setCEmail={buyingCenter.setCEmail}
        cPhone={buyingCenter.cPhone}
        setCPhone={buyingCenter.setCPhone}
        cLinkedIn={buyingCenter.cLinkedIn}
        setCLinkedIn={buyingCenter.setCLinkedIn}
        cRole={buyingCenter.cRole}
        setCRole={buyingCenter.setCRole}
        cIsRefApprovalContact={buyingCenter.cIsRefApprovalContact}
        setCIsRefApprovalContact={buyingCenter.setCIsRefApprovalContact}
        onSave={buyingCenter.saveContact}
      />
    </div>
  )
}

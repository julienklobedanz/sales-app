'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { ReferenceFormViewModel } from '@/lib/references/reference-form/use-reference-form'
import type { SearchReferenceFormCompanies } from '@/lib/references/reference-form/reference-form-types'
import { ReferenceFormCompanySection } from '@/lib/references/reference-form/reference-form-company-section'
import { ReferenceFormStorySection } from '@/lib/references/reference-form/reference-form-story-section'
import { ReferenceFormContactsSection } from '@/lib/references/reference-form/reference-form-contacts-section'
import { ReferenceFormProjectSection } from '@/lib/references/reference-form/reference-form-project-section'
import { ReferenceFormFilesSection } from '@/lib/references/reference-form/reference-form-files-section'

export function ReferenceFormContent({
  searchCompanies,
  ...props
}: ReferenceFormViewModel & { searchCompanies?: SearchReferenceFormCompanies }) {
  return (
    <div className="space-y-6">
      <ReferenceFormCompanySection
        isEditMode={props.isEditMode}
        submitting={props.submitting}
        companyId={props.companyId}
        setCompanyId={props.setCompanyId}
        title={props.title}
        setTitle={props.setTitle}
        industry={props.industry}
        setIndustry={props.setIndustry}
        country={props.country}
        setCountry={props.setCountry}
        website={props.website}
        setWebsite={props.setWebsite}
        employeeCount={props.employeeCount}
        setEmployeeCount={props.setEmployeeCount}
        newCompanyName={props.newCompanyName}
        setNewCompanyName={props.setNewCompanyName}
        enrichLoading={props.enrichLoading}
        editCompanyName={props.editCompanyName}
        setEditCompanyName={props.setEditCompanyName}
        setEnrichedCompany={props.setEnrichedCompany}
        setBrandfetchLogoUrl={props.setBrandfetchLogoUrl}
        magicImportLoading={props.magicImportLoading}
        displayCompanies={props.displayCompanies}
        currentCompanyNameForAvatar={props.currentCompanyNameForAvatar}
        applyBrandfetchPreview={props.applyBrandfetchPreview}
        handleMagicImport={props.handleMagicImport}
        searchCompanies={searchCompanies}
      />

      <ReferenceFormStorySection
        initialData={props.initialData}
        submitting={props.submitting}
        summary={props.summary}
        setSummary={props.setSummary}
        customerChallenge={props.customerChallenge}
        setCustomerChallenge={props.setCustomerChallenge}
        ourSolution={props.ourSolution}
        setOurSolution={props.setOurSolution}
        tags={props.tags}
        setTags={props.setTags}
        tagInputValue={props.tagInputValue}
        setTagInputValue={props.setTagInputValue}
        summaryLoading={props.summaryLoading}
        setSummaryLoading={props.setSummaryLoading}
        normalizeTag={props.normalizeTag}
      />

      <Card>
        <CardContent className="space-y-4">
          <ReferenceFormContactsSection
            submitting={props.submitting}
            contactId={props.contactId}
            setContactId={props.setContactId}
            displayContacts={props.displayContacts}
            customer_contact_id={props.customer_contact_id}
            setCustomerContactId={props.setCustomerContactId}
            displayCustomerContacts={props.displayCustomerContacts}
            editingInternalContact={props.editingInternalContact}
            setEditingInternalContact={props.setEditingInternalContact}
            editingCustomerContact={props.editingCustomerContact}
            setEditingCustomerContact={props.setEditingCustomerContact}
            handleContactCreated={props.handleContactCreated}
            handleCustomerContactCreated={props.handleCustomerContactCreated}
            newCompanyName={props.newCompanyName}
            currentCompanyId={props.currentCompanyId}
            setAdditionalContacts={props.setAdditionalContacts}
            setAdditionalCustomerContacts={props.setAdditionalCustomerContacts}
          />

          <ReferenceFormProjectSection
            submitting={props.submitting}
            volumeEur={props.volumeEur}
            setVolumeEur={props.setVolumeEur}
            volumeCurrency={props.volumeCurrency}
            setVolumeCurrency={props.setVolumeCurrency}
            contractType={props.contractType}
            setContractType={props.setContractType}
            projectStatus={props.projectStatus}
            setProjectStatus={props.setProjectStatus}
            projectStart={props.projectStart}
            setProjectStart={props.setProjectStart}
            projectEnd={props.projectEnd}
            setProjectEnd={props.setProjectEnd}
          />
        </CardContent>
      </Card>

      <ReferenceFormFilesSection
        initialData={props.initialData}
        submitting={props.submitting}
        incumbentProvider={props.incumbentProvider}
        setIncumbentProvider={props.setIncumbentProvider}
        competitors={props.competitors}
        setCompetitors={props.setCompetitors}
        status={props.status}
        setStatus={props.setStatus}
        ndaDeal={props.ndaDeal}
        setNdaDeal={props.setNdaDeal}
        statusBeforeNdaRef={props.statusBeforeNdaRef}
        competitorInputValue={props.competitorInputValue}
        setCompetitorInputValue={props.setCompetitorInputValue}
        incumbentInputValue={props.incumbentInputValue}
        setIncumbentInputValue={props.setIncumbentInputValue}
        incumbentSuggestions={props.incumbentSuggestions}
        setIncumbentSuggestions={props.setIncumbentSuggestions}
        competitorSuggestions={props.competitorSuggestions}
        setCompetitorSuggestions={props.setCompetitorSuggestions}
        selectedFile={props.selectedFile}
        setSelectedFile={props.setSelectedFile}
      />
    </div>
  )
}

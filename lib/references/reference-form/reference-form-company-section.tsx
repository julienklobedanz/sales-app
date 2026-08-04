'use client'

import { Loader } from '@hugeicons/core-free-icons'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IndustrySelect } from '@/components/forms/industry-select'
import { AppIcon } from '@/lib/icons'
import { COUNTRIES } from '@/lib/references/reference-form/reference-form-constants'
import { RequiredLabel, OptionalLabel } from '@/lib/references/reference-form/reference-form-labels'
import { formatThousandsDots } from '@/lib/references/reference-form/reference-form-pure'
import type { ReferenceFormViewModel } from '@/lib/references/reference-form/use-reference-form'
import {
  CompanyCombobox,
  MagicImportDropzone,
} from '@/lib/references/reference-form/reference-form-fields'
import type { SearchReferenceFormCompanies } from '@/lib/references/reference-form/reference-form-types'

export type ReferenceFormCompanySectionProps = Pick<
  ReferenceFormViewModel,
  | 'isEditMode'
  | 'submitting'
  | 'companyId'
  | 'setCompanyId'
  | 'title'
  | 'setTitle'
  | 'industry'
  | 'setIndustry'
  | 'country'
  | 'setCountry'
  | 'website'
  | 'setWebsite'
  | 'employeeCount'
  | 'setEmployeeCount'
  | 'newCompanyName'
  | 'setNewCompanyName'
  | 'enrichLoading'
  | 'editCompanyName'
  | 'setEditCompanyName'
  | 'setEnrichedCompany'
  | 'setBrandfetchLogoUrl'
  | 'magicImportLoading'
  | 'displayCompanies'
  | 'currentCompanyNameForAvatar'
  | 'applyBrandfetchPreview'
  | 'handleMagicImport'
> & {
  searchCompanies?: SearchReferenceFormCompanies
}

export function ReferenceFormCompanySection({
  isEditMode,
  submitting,
  companyId,
  setCompanyId,
  title,
  setTitle,
  industry,
  setIndustry,
  country,
  setCountry,
  website,
  setWebsite,
  employeeCount,
  setEmployeeCount,
  newCompanyName,
  setNewCompanyName,
  enrichLoading,
  editCompanyName,
  setEditCompanyName,
  setEnrichedCompany,
  setBrandfetchLogoUrl,
  magicImportLoading,
  displayCompanies,
  currentCompanyNameForAvatar,
  applyBrandfetchPreview,
  handleMagicImport,
  searchCompanies,
}: ReferenceFormCompanySectionProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        {!isEditMode && (
          <div className="space-y-4">
            <MagicImportDropzone
              onFileAccept={handleMagicImport}
              loading={magicImportLoading}
              disabled={submitting}
            />
            <Separator className="mt-2" />
          </div>
        )}
        {/* Unternehmen */}
        <div className="grid grid-cols-1 gap-4 items-start">
          <div className="space-y-2">
            <RequiredLabel htmlFor={isEditMode ? 'company_name' : 'companyId'}>
              Unternehmen
            </RequiredLabel>
            {isEditMode ? (
              <div className="relative">
                <Input
                  id="company_name"
                  name="company_name"
                  placeholder="z. B. BMW oder bmw.de für Auto-Fill"
                  required
                  disabled={submitting}
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                />
                {enrichLoading && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <AppIcon icon={Loader} size={16} className="animate-spin" />
                  </span>
                )}
              </div>
            ) : (
              <>
                <div className="relative">
                  <CompanyCombobox
                    companies={displayCompanies}
                    value={currentCompanyNameForAvatar}
                    onValueChange={(val) => {
                      setNewCompanyName(val)
                      setCompanyId('')
                    }}
                    onConfirmValue={(val) => {
                      setNewCompanyName(val)
                      setCompanyId('')
                      applyBrandfetchPreview(val)
                    }}
                    onAutoRemotePreview={(q) => applyBrandfetchPreview(q, { silent: true })}
                    previewLoading={enrichLoading}
                    onSelectCompany={(company) => {
                      if (company.id.startsWith('brandfetch:')) {
                        setCompanyId('')
                        setNewCompanyName(company.name)
                        applyBrandfetchPreview(company.name, { silent: true })
                        return
                      }
                      setCompanyId(company.id)
                      setNewCompanyName(company.name)
                      setEnrichedCompany(null)
                      setBrandfetchLogoUrl('')
                    }}
                    loading={enrichLoading}
                    disabled={submitting}
                    companyId={companyId}
                    searchCompanies={searchCompanies}
                  />
                </div>
                <input type="hidden" name="companyId" value={companyId} />
                <input type="hidden" name="newCompanyName" value={newCompanyName} />
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <RequiredLabel htmlFor="title">Titel</RequiredLabel>
          <Input
            id="title"
            name="title"
            placeholder="z. B. Cloud Transformation 2024"
            required
            disabled={submitting}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <OptionalLabel>Industrie</OptionalLabel>
            <input type="hidden" name="industry" value={industry} />
            <IndustrySelect
              value={industry}
              onValueChange={setIndustry}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <OptionalLabel>HQ</OptionalLabel>
            <input type="hidden" name="country" value={country} />
            <Select
              value={country || undefined}
              onValueChange={setCountry}
              disabled={submitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Auswählen …" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <OptionalLabel htmlFor="employee_count">Mitarbeiter</OptionalLabel>
            <Input
              id="employee_count"
              name="employee_count"
              type="text"
              inputMode="numeric"
              placeholder="z. B. 12000"
              disabled={submitting}
              value={employeeCount}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                setEmployeeCount(digits ? formatThousandsDots(digits) : '')
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <OptionalLabel htmlFor="website">Website</OptionalLabel>
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="z. B. https://example.com"
              disabled={submitting}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

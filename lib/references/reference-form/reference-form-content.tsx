'use client'

/* eslint-disable @next/next/no-img-element */

import { Email, Loader, Phone, Sparkles } from '@hugeicons/core-free-icons'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Command, CommandItem, CommandList } from '@/components/ui/command'
import { IndustrySelect } from '@/components/forms/industry-select'
import { AppIcon } from '@/lib/icons'
import { REFERENCE_NARRATIVE_MAX_CHARS } from '@/lib/references/reference-narrative-limits'
import {
  CONTRACT_TYPE_GROUPS,
  CONTRACT_TYPE_VALUES,
  formatContractTypeDisplay,
} from '@/lib/references/contract-type'
import {
  COUNTRIES,
  PROJECT_STATUS_OPTIONS,
  STATUS_HELP_TEXT,
  STATUS_OPTIONS,
  VOLUME_CURRENCY_OPTIONS,
} from '@/lib/references/reference-form/reference-form-constants'
import { RequiredLabel, OptionalLabel } from '@/lib/references/reference-form/reference-form-labels'
import { normalizeTag, formatThousandsDots } from '@/lib/references/reference-form/reference-form-pure'
import type {
  ContactPerson,
  ExternalContactDisplay,
  ReferenceFormInitialData,
} from '@/lib/references/reference-form/reference-form-types'
import type { ReferenceFormViewModel } from '@/lib/references/reference-form/use-reference-form'
import {
  CompanyCombobox,
  FileDropZone,
  MagicImportDropzone,
} from '@/app/dashboard/evidence/new/reference-form-fields'
import { CreateContactDialog } from '@/app/dashboard/evidence/new/create-contact-dialog'
import { generateSummaryFromStory, getCompetitorSuggestions, getIncumbentSuggestions } from '@/app/dashboard/actions'

export function ReferenceFormContent(props: ReferenceFormViewModel) {
  const {
    isEditMode,
    initialData,
    submitting,
    companyId,
    setCompanyId,
    title,
    setTitle,
    summary,
    setSummary,
    industry,
    setIndustry,
    country,
    setCountry,
    website,
    setWebsite,
    employeeCount,
    setEmployeeCount,
    volumeEur,
    setVolumeEur,
    volumeCurrency,
    setVolumeCurrency,
    contractType,
    setContractType,
    incumbentProvider,
    setIncumbentProvider,
    competitors,
    setCompetitors,
    customerChallenge,
    setCustomerChallenge,
    ourSolution,
    setOurSolution,
    status,
    setStatus,
    ndaDeal,
    setNdaDeal,
    statusBeforeNdaRef,
    contactId,
    setContactId,
    displayContacts,
    customer_contact_id,
    setCustomerContactId,
    displayCustomerContacts,
    editingInternalContact,
    setEditingInternalContact,
    editingCustomerContact,
    setEditingCustomerContact,
    handleContactCreated,
    handleCustomerContactCreated,
    tags,
    setTags,
    tagInputValue,
    setTagInputValue,
    competitorInputValue,
    setCompetitorInputValue,
    incumbentInputValue,
    setIncumbentInputValue,
    incumbentSuggestions,
    setIncumbentSuggestions,
    competitorSuggestions,
    setCompetitorSuggestions,
    projectStatus,
    setProjectStatus,
    projectStart,
    setProjectStart,
    projectEnd,
    setProjectEnd,
    selectedFile,
    setSelectedFile,
    newCompanyName,
    setNewCompanyName,
    enrichLoading,
    editCompanyName,
    setEditCompanyName,
    setEnrichedCompany,
    setBrandfetchLogoUrl,
    magicImportLoading,
    summaryLoading,
    setSummaryLoading,
    displayCompanies,
    currentCompanyId,
    currentCompanyNameForAvatar,
    applyBrandfetchPreview,
    handleMagicImport,
    normalizeTag,
    setAdditionalContacts,
    setAdditionalCustomerContacts,
  } = props

    const volumeBlock = (
      <div className="space-y-2">
        <OptionalLabel htmlFor="volume_eur">Volumen</OptionalLabel>
        <div className="flex min-w-0 max-w-full items-center gap-2">
          <Input
            id="volume_eur"
            name="volume_eur"
            type="text"
            inputMode="numeric"
            placeholder="z. B. 5.000.000"
            disabled={submitting}
            className="min-w-0 flex-1 sm:max-w-none"
            value={volumeEur}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '')
              if (!digits) {
                setVolumeEur('')
                return
              }
              const withSeparators = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
              setVolumeEur(withSeparators)
            }}
          />
          <Select value={volumeCurrency} onValueChange={setVolumeCurrency} disabled={submitting}>
            <SelectTrigger
              className="h-10 w-[104px] shrink-0 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
              aria-label="Währung wählen"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOLUME_CURRENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.code} value={opt.code}>
                  {opt.symbol} ({opt.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )

    const contractBlock = (
      <div className="space-y-2">
        <OptionalLabel htmlFor="contract_type">Vertragsart</OptionalLabel>
        <input type="hidden" name="contract_type" value={contractType} />
        <Select value={contractType || undefined} onValueChange={setContractType} disabled={submitting}>
          <SelectTrigger id="contract_type" className="w-full">
            <SelectValue placeholder="Auswählen …" />
          </SelectTrigger>
          <SelectContent>
            {CONTRACT_TYPE_GROUPS.map((group, groupIndex) => (
              <div key={group.label}>
                <SelectGroup>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {groupIndex < CONTRACT_TYPE_GROUPS.length - 1 ? <SelectSeparator /> : null}
              </div>
            ))}
            {contractType && !CONTRACT_TYPE_VALUES.includes(contractType) ? (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Bestehender Wert</SelectLabel>
                  <SelectItem value={contractType}>
                    {formatContractTypeDisplay(contractType)}
                  </SelectItem>
                </SelectGroup>
              </>
            ) : null}
          </SelectContent>
        </Select>
      </div>
    )

    return (
      <div className="space-y-6">
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

        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <OptionalLabel htmlFor="summary">Zusammenfassung</OptionalLabel>
              <div className="relative">
                <Textarea
                  id="summary"
                  name="summary"
                  placeholder="Kurze Beschreibung der Referenz …"
                  rows={4}
                  disabled={submitting}
                  value={summary}
                  maxLength={REFERENCE_NARRATIVE_MAX_CHARS}
                  onChange={(e) => setSummary(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:bg-muted"
                  disabled={submitting || summaryLoading}
                  onClick={async () => {
                    setSummaryLoading(true)
                    try {
                      const result = await generateSummaryFromStory(
                        customerChallenge,
                        ourSolution,
                        initialData?.id
                      )
                      if (result.success) {
                        setSummary(result.summary)
                        toast.success('KI-Zusammenfassung übernommen.')
                      } else {
                        toast.error(result.error)
                      }
                    } finally {
                      setSummaryLoading(false)
                    }
                  }}
                  aria-label="KI-Vorschlag für Zusammenfassung"
                >
                  {summaryLoading ? (
                    <AppIcon icon={Loader} size={14} className="animate-spin" />
                  ) : (
                    <AppIcon icon={Sparkles} size={14} />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-right tabular-nums">
                {summary.length}/{REFERENCE_NARRATIVE_MAX_CHARS}
              </p>
            </div>

            {/* Storytelling: Herausforderung & Lösung */}
            <div className="space-y-3">
              <div className="space-y-1">
                <RequiredLabel htmlFor="customer_challenge">
                  Herausforderung des Kunden
                </RequiredLabel>
                <Textarea
                  id="customer_challenge"
                  name="customer_challenge"
                  placeholder="Welche Herausforderung oder welches Ziel hatte der Kunde?"
                  rows={4}
                  disabled={submitting}
                  value={customerChallenge}
                  maxLength={REFERENCE_NARRATIVE_MAX_CHARS}
                  onChange={(e) => setCustomerChallenge(e.target.value)}
                  className="text-sm leading-relaxed"
                />
                <p className="text-xs text-muted-foreground text-right tabular-nums">
                  {customerChallenge.length}/{REFERENCE_NARRATIVE_MAX_CHARS}
                </p>
              </div>
              <div className="space-y-1">
                <RequiredLabel htmlFor="our_solution">Unsere Lösung</RequiredLabel>
                <Textarea
                  id="our_solution"
                  name="our_solution"
                  placeholder="Wie haben wir die Herausforderung gelöst?"
                  rows={4}
                  disabled={submitting}
                  value={ourSolution}
                  maxLength={REFERENCE_NARRATIVE_MAX_CHARS}
                  onChange={(e) => setOurSolution(e.target.value)}
                  className="text-sm leading-relaxed"
                />
                <p className="text-xs text-muted-foreground text-right tabular-nums">
                  {ourSolution.length}/{REFERENCE_NARRATIVE_MAX_CHARS}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <OptionalLabel htmlFor="tags-input">Tags</OptionalLabel>
              <input type="hidden" name="tags" value={tags.join(' ')} />
              <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30 disabled:cursor-not-allowed disabled:opacity-50">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      className="rounded-full hover:bg-muted-foreground/20 -mr-0.5 p-0.5"
                      aria-label={`Tag „${tag}" entfernen`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  id="tags-input"
                  type="text"
                  placeholder={
                    tags.length === 0
                      ? 'z. B. Cloud — Enter drücken, um einen Tag zu übernehmen'
                      : 'Weiterer Tag… (Enter)'
                  }
                  disabled={submitting}
                  value={tagInputValue}
                  onChange={(e) => setTagInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const value = normalizeTag(tagInputValue)
                      if (value) {
                        setTags((prev) => {
                          const exists = prev.some(
                            (t) => t.toLowerCase() === value.toLowerCase()
                          )
                          return exists ? prev : [...prev, value]
                        })
                        setTagInputValue('')
                      }
                    }
                  }}
                  className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
      <div className="space-y-6">
        <div className="space-y-2">
          <RequiredLabel htmlFor="contactId">Ansprechpartner intern</RequiredLabel>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="hidden"
                name="contactId"
                value={contactId === '__none__' ? '' : contactId}
              />
              <Select
                value={contactId || '__none__'}
                onValueChange={(v) => setContactId(v ?? '__none__')}
                disabled={submitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Person auswählen …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keine</SelectItem>
                  {displayContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="truncate">
                            {[c.first_name, c.last_name].filter(Boolean).join(' ') ||
                              c.email ||
                              c.id}
                            {c.email ? ` (${c.email})` : ''}
                          </span>
                          <button
                            type="button"
                            className="text-[10px] text-primary hover:underline text-left"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingInternalContact(c)
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
                <CreateContactDialog onContactCreated={handleContactCreated} />
          </div>
          {contactId && contactId !== '__none__' && (() => {
            const c = displayContacts.find((x) => x.id === contactId)
            return c?.email ? (
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-[10px]">
                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:underline">
                  <AppIcon icon={Email} size={14} />
                  {c.email}
                </a>
              </div>
            ) : null
          })()}
          <p className="text-muted-foreground text-[10px] italic">
            Wird für Freigabe-Anfragen per E-Mail benachrichtigt.
          </p>
        </div>

        <div className="space-y-2">
          <OptionalLabel htmlFor="customer_contact_id">Kundenansprechpartner</OptionalLabel>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="hidden"
                name="customer_contact_id"
                value={customer_contact_id === '__none__' ? '' : customer_contact_id}
              />
              <Select
                value={customer_contact_id || '__none__'}
                onValueChange={(v) => setCustomerContactId(v ?? '__none__')}
                disabled={submitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Person auswählen …" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keine</SelectItem>
                  {displayCustomerContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="truncate">
                            {[c.first_name, c.last_name].filter(Boolean).join(' ') ||
                              c.email ||
                              c.id}
                            {c.email ? ` (${c.email})` : ''}
                          </span>
                          <button
                            type="button"
                            className="text-[10px] text-primary hover:underline text-left"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingCustomerContact(c)
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CreateContactDialog
              variant="external"
              companyId={currentCompanyId || undefined}
              onContactCreated={handleCustomerContactCreated}
              disabled={!currentCompanyId}
            />
          </div>
          {customer_contact_id && customer_contact_id !== '__none__' && (() => {
            const c = displayCustomerContacts.find((x) => x.id === customer_contact_id)
            return (c?.email || c?.phone) ? (
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[10px]">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:underline">
                    <AppIcon icon={Email} size={14} />
                    {c.email}
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:underline">
                    <AppIcon icon={Phone} size={14} />
                    {c.phone}
                  </a>
                )}
              </div>
            ) : null
          })()}
          {!currentCompanyId && (
            <p className="text-muted-foreground text-[10px] italic">
              {newCompanyName.trim()
                ? 'Kundenkontakt: Nach dem Speichern der Referenz ergänzen (neues Unternehmen wird mit angelegt).'
                : 'Feld wird aktiviert, sobald oben ein Unternehmen ausgewählt wurde.'}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
          <RequiredLabel htmlFor="project_status">Projektstatus</RequiredLabel>
        <input
          type="hidden"
          name="project_status"
          value={projectStatus === '__none__' ? '' : projectStatus}
        />
        <Select
          value={projectStatus || '__none__'}
          onValueChange={(val) => {
            setProjectStatus(val)
            if (val === 'active') setProjectEnd('')
          }}
          disabled={submitting}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Auswählen …" />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {editingInternalContact && (
        <CreateContactDialog
          mode="edit"
          variant="internal"
          onContactCreated={(updated) => {
            const u = updated as ContactPerson
            setAdditionalContacts((prev) =>
              prev.some((p) => p.id === u.id)
                ? prev.map((p) => (p.id === u.id ? u : p))
                : [...prev, u]
            )
            setEditingInternalContact(null)
          }}
          disabled={submitting}
          initialContact={editingInternalContact}
        />
      )}
      {editingCustomerContact && (
        <CreateContactDialog
          mode="edit"
          variant="external"
          companyId={currentCompanyId || undefined}
          onContactCreated={(updated) => {
            const u = updated as ExternalContactDisplay
            setAdditionalCustomerContacts((prev) =>
              prev.some((p) => p.id === u.id)
                ? prev.map((p) => (p.id === u.id ? u : p))
                : [...prev, u]
            )
            setEditingCustomerContact(null)
          }}
          disabled={submitting}
          initialContact={editingCustomerContact}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <RequiredLabel htmlFor="project_start">Projektstart</RequiredLabel>
          <Input
            id="project_start"
            name="project_start"
            type="date"
            disabled={submitting}
            value={projectStart}
            onChange={(e) => setProjectStart(e.target.value)}
          />
        </div>
        {projectStatus === 'active' ? (
          volumeBlock
        ) : (
          <div className="space-y-2">
            {projectStatus === 'completed' ? (
              <RequiredLabel htmlFor="project_end">Projektende</RequiredLabel>
            ) : (
              <OptionalLabel htmlFor="project_end">Projektende</OptionalLabel>
            )}
            <Input
              id="project_end"
              name="project_end"
              type="date"
              disabled={submitting}
              value={projectEnd}
              onChange={(e) => setProjectEnd(e.target.value)}
              required={projectStatus === 'completed'}
            />
            {projectStatus === 'completed' ? (
              <p className="text-muted-foreground text-[10px] italic">
                Erforderlich bei abgeschlossenem Projekt.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {projectStatus === 'active' ? (
        <div className="space-y-2">{contractBlock}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {volumeBlock}
          {contractBlock}
        </div>
      )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <OptionalLabel htmlFor="incumbent_provider">
            Aktueller Dienstleister (Incumbent)
          </OptionalLabel>
          <input type="hidden" name="incumbent_provider" value={incumbentProvider} />
          <div className="relative">
            <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
              {incumbentProvider
                .split(/[;,]+/)
                .map((s) => s.trim())
                .filter(Boolean)
                .map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {name}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setIncumbentProvider(
                          incumbentProvider
                            .split(/[;,]+/)
                            .map((s) => s.trim())
                            .filter((n) => n && n.toLowerCase() !== name.toLowerCase())
                            .join(', ')
                        )
                      }}
                      className="rounded-full px-1 hover:bg-accent"
                      aria-label={`Incumbent „${name}" entfernen`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              <input
                id="incumbent_provider"
                placeholder={
                  incumbentProvider.trim()
                    ? 'Weiteren Dienstleister hinzufügen…'
                    : 'z. B. bisheriger Anbieter'
                }
                disabled={submitting}
                value={incumbentInputValue}
                onChange={async (e) => {
                  const value = e.target.value
                  setIncumbentInputValue(value)
                  if (!value.trim()) {
                    setIncumbentSuggestions([])
                    return
                  }
                  try {
                    const list = await getIncumbentSuggestions(value)
                    setIncumbentSuggestions(list)
                  } catch {
                    setIncumbentSuggestions([])
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === ',' || e.key === 'Enter') {
                    e.preventDefault()
                    const raw = incumbentInputValue.trim()
                    if (!raw) return
                    const parts = raw.split(/[;,]+/).map((s) => s.trim()).filter(Boolean)
                    const existing = incumbentProvider
                      .split(/[;,]+/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                    const merged = [...existing]
                    parts.forEach((p) => {
                      if (!merged.some((n) => n.toLowerCase() === p.toLowerCase())) {
                        merged.push(p)
                      }
                    })
                    setIncumbentProvider(merged.join(', '))
                    setIncumbentInputValue('')
                    setIncumbentSuggestions([])
                  }
                }}
                className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            {incumbentSuggestions.length > 0 && incumbentInputValue.trim() && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-sm shadow-md">
                <Command>
                  <CommandList>
                    {incumbentSuggestions.map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={(val) => {
                          const existing = incumbentProvider
                            .split(/[;,]+/)
                            .map((s) => s.trim())
                            .filter(Boolean)
                          if (!existing.some((n) => n.toLowerCase() === val.toLowerCase())) {
                            setIncumbentProvider([...existing, val].join(', '))
                          }
                          setIncumbentInputValue('')
                          setIncumbentSuggestions([])
                        }}
                      >
                        {name}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <OptionalLabel htmlFor="competitors">
            Weitere beteiligte Wettbewerber
          </OptionalLabel>
          <div className="relative">
            <input type="hidden" name="competitors" value={competitors} />
            <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30">
              {competitors
                .split(/[;,]+/)
                .map((s) => s.trim())
                .filter(Boolean)
                .map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {name}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setCompetitors(
                          competitors
                            .split(/[;,]+/)
                            .map((s) => s.trim())
                            .filter((n) => n && n !== name)
                            .join(', ')
                        )
                      }}
                      className="rounded-full px-1 hover:bg-accent"
                      aria-label={`Wettbewerber „${name}" entfernen`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              <div className="relative flex-1 min-w-[120px]">
                <input
                  id="competitors"
                  placeholder={
                    competitors.trim()
                      ? 'Weiteren Wettbewerber hinzufügen…'
                      : 'z. B. Accenture, Deloitte'
                  }
                  disabled={submitting}
                  value={competitorInputValue}
                  onChange={async (e) => {
                    const value = e.target.value
                    setCompetitorInputValue(value)
                    if (!value.trim()) {
                      setCompetitorSuggestions([])
                      return
                    }
                    try {
                      const list = await getCompetitorSuggestions(value)
                      setCompetitorSuggestions(list)
                    } catch {
                      setCompetitorSuggestions([])
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === ',' || e.key === 'Enter') {
                      e.preventDefault()
                      const raw = competitorInputValue.trim()
                      if (!raw) return
                      const parts = raw.split(/[;,]+/).map((s) => s.trim()).filter(Boolean)
                      const existing = competitors
                        .split(/[;,]+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                      const merged = [...existing]
                      parts.forEach((p) => {
                        if (!merged.some((n) => n.toLowerCase() === p.toLowerCase())) {
                          merged.push(p)
                        }
                      })
                      setCompetitors(merged.join(', '))
                      setCompetitorInputValue('')
                      setCompetitorSuggestions([])
                    }
                  }}
                  className="w-full border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {competitorSuggestions.length > 0 && competitorInputValue.trim() && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-sm shadow-md">
                    <Command>
                      <CommandList>
                        {competitorSuggestions.map((name) => (
                          <CommandItem
                            key={name}
                            value={name}
                            onSelect={(val) => {
                              const existing = competitors
                                .split(/[;,]+/)
                                .map((s) => s.trim())
                                .filter(Boolean)
                              if (!existing.some((n) => n.toLowerCase() === val.toLowerCase())) {
                                setCompetitors([...existing, val].join(', '))
                              }
                              setCompetitorInputValue('')
                              setCompetitorSuggestions([])
                            }}
                          >
                            {name}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <OptionalLabel>PDF Anhang</OptionalLabel>
        <FileDropZone
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          disabled={submitting}
          existingFilePath={initialData?.file_path}
        />
      </div>

      {/* Status + NDA */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <RequiredLabel htmlFor="status">Status / Freigabestufe</RequiredLabel>
          <input type="hidden" name="status" value={status} />
          <Select
            value={status}
            onValueChange={(val) => {
              const next = val as ReferenceFormInitialData['status']
              setStatus(next)
              if (ndaDeal && next !== 'internal_only') {
                // Falls Status manuell geändert wird, lösen wir NDA-Modus wieder auf
                setNdaDeal(false)
                statusBeforeNdaRef.current = next
              }
            }}
            disabled={submitting || ndaDeal}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-[10px] italic">
            {ndaDeal
              ? 'NDA Deal aktiv: Status wird automatisch auf „Intern“ gesetzt.'
              : STATUS_HELP_TEXT[status]}
          </p>
        </div>

        <div className="space-y-1">
          <OptionalLabel htmlFor="nda_deal">Ist dies ein NDA Deal?</OptionalLabel>
          <Switch
            id="nda_deal"
            checked={ndaDeal}
            disabled={submitting}
            onCheckedChange={(checked) => {
              setNdaDeal(checked)
              if (checked) {
                statusBeforeNdaRef.current = status
                setStatus('internal_only')
              } else {
                setStatus(statusBeforeNdaRef.current ?? 'draft')
              }
            }}
          />
        </div>
      </div>
          </CardContent>
        </Card>
      </div>
    )
}


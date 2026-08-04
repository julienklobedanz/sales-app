'use client'

import { Email, Phone } from '@hugeicons/core-free-icons'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppIcon } from '@/lib/icons'
import {
  RequiredLabel,
  OptionalLabel,
} from '@/lib/references/reference-form/reference-form-labels'
import type {
  ContactPerson,
  ExternalContactDisplay,
} from '@/lib/references/reference-form/reference-form-types'
import type { ReferenceFormViewModel } from '@/lib/references/reference-form/use-reference-form'
import { CreateContactDialog } from '@/app/dashboard/references/new/create-contact-dialog'

export type ReferenceFormContactsSectionProps = Pick<
  ReferenceFormViewModel,
  | 'submitting'
  | 'contactId'
  | 'setContactId'
  | 'displayContacts'
  | 'customer_contact_id'
  | 'setCustomerContactId'
  | 'displayCustomerContacts'
  | 'editingInternalContact'
  | 'setEditingInternalContact'
  | 'editingCustomerContact'
  | 'setEditingCustomerContact'
  | 'handleContactCreated'
  | 'handleCustomerContactCreated'
  | 'newCompanyName'
  | 'currentCompanyId'
  | 'setAdditionalContacts'
  | 'setAdditionalCustomerContacts'
>

export function ReferenceFormContactsSection({
  submitting,
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
  newCompanyName,
  currentCompanyId,
  setAdditionalContacts,
  setAdditionalCustomerContacts,
}: ReferenceFormContactsSectionProps) {
  return (
    <>
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
          {contactId &&
            contactId !== '__none__' &&
            (() => {
              const c = displayContacts.find((x) => x.id === contactId)
              return c?.email ? (
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-[10px]">
                  <a
                    href={`mailto:${c.email}`}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
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
          <OptionalLabel htmlFor="customer_contact_id">
            Kundenansprechpartner
          </OptionalLabel>
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
          {customer_contact_id &&
            customer_contact_id !== '__none__' &&
            (() => {
              const c = displayCustomerContacts.find((x) => x.id === customer_contact_id)
              return c?.email || c?.phone ? (
                <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[10px]">
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <AppIcon icon={Email} size={14} />
                      {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
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

      {editingInternalContact && (
        <CreateContactDialog
          mode="edit"
          variant="internal"
          onContactCreated={(updated) => {
            const u = updated as ContactPerson
            setAdditionalContacts((prev) =>
              prev.some((p) => p.id === u.id)
                ? prev.map((p) => (p.id === u.id ? u : p))
                : [...prev, u],
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
                : [...prev, u],
            )
            setEditingCustomerContact(null)
          }}
          disabled={submitting}
          initialContact={editingCustomerContact}
        />
      )}
    </>
  )
}

'use client'

import { Dialog, DialogContent } from '@/components/ui/dialog'

import type { ExternalContact } from '../evidence/new/actions'
import { ReferenceForm, type ContactPerson } from '../evidence/new/reference-form'

type CompanyOption = { id: string; name: string; logo_url?: string | null }

export function NewReferenceDialog({
  open,
  onOpenChange,
  companies,
  contacts,
  externalContacts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: CompanyOption[]
  contacts: ContactPerson[]
  externalContacts: ExternalContact[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,920px)] max-h-[90vh] w-[calc(100vw-2rem)] max-w-[90vw] flex-col gap-0 overflow-hidden border-0 p-0 lg:max-w-7xl">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-6 md:px-12 md:py-8 lg:px-16 lg:py-10">
          <ReferenceForm
            layout="dialog"
            companies={companies}
            contacts={contacts}
            externalContacts={externalContacts}
            onSuccess={() => onOpenChange(false)}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

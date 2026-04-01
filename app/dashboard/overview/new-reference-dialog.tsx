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
      <DialogContent className="max-h-[90vh] min-h-[60vh] overflow-y-auto w-[calc(100vw-2rem)] max-w-[90vw] lg:max-w-7xl gap-0 border-0 px-6 py-6 md:px-12 md:py-10 lg:px-16 lg:py-12">
        <div className="flex flex-col items-center w-full max-w-full">
          <ReferenceForm
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

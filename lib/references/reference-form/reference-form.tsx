'use client'

import { useRouter } from 'next/navigation'
import { CirclePlus } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { AppIcon } from '@/lib/icons'
import { ROUTES } from '@/lib/routes'
import { ReferenceFormContent } from '@/lib/references/reference-form/reference-form-content'
import { useReferenceForm } from '@/lib/references/reference-form/use-reference-form'
import type {
  ContactPerson,
  ExternalContactDisplay,
  ReferenceFormInitialData,
} from '@/lib/references/reference-form/reference-form-types'
import type { ReferenceFormCompany } from '@/app/dashboard/references/new/reference-form-fields'
import type { ExternalContact } from '@/app/dashboard/references/new/actions'

type Company = ReferenceFormCompany

export type { ContactPerson, ExternalContactDisplay, ReferenceFormInitialData }

export function ReferenceForm({
  companies = [],
  contacts = [],
  externalContacts = [],
  initialData,
  onSuccess,
  onClose,
  layout = 'page',
}: {
  companies?: Company[]
  contacts?: ContactPerson[]
  externalContacts?: ExternalContact[]
  initialData?: ReferenceFormInitialData
  onSuccess?: () => void
  onClose?: () => void
  layout?: 'page' | 'dialog'
}) {
  const router = useRouter()
  const vm = useReferenceForm({
    companies,
    contacts,
    externalContacts,
    initialData,
    onSuccess,
    router,
  })

  const actionBar = (
    <div
      className={
        layout === 'dialog'
          ? 'shrink-0 border-t border-border/80 bg-background px-4 py-3 shadow-[0_-4px_12px_-4px_rgba(15,23,42,0.08)]'
          : 'sticky bottom-0 z-40 mt-6 border-t bg-background/80 backdrop-blur'
      }
    >
      <div className="flex items-center justify-end gap-3 px-0 sm:px-1">
        <Button
          type="button"
          variant="outline"
          disabled={vm.submitting}
          onClick={() => (onClose ? onClose() : router.push(ROUTES.home))}
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          form={vm.formId}
          disabled={vm.submitting}
          className="rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:from-blue-600 hover:to-blue-700/95"
        >
          <AppIcon icon={CirclePlus} size={16} className="mr-2" />
          Speichern
        </Button>
      </div>
    </div>
  )

  const formInnerClass = 'w-full min-w-0 space-y-6 pb-2'
  const contentProps = { ...vm, layout }

  return (
    <div
      className={
        layout === 'dialog'
          ? 'flex min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden'
          : 'w-full max-w-4xl min-w-0 pb-6'
      }
    >
      {layout === 'dialog' ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-0">
            {vm.isEditMode ? (
              <form id={vm.formId} noValidate onSubmit={vm.handleEditSubmit} className={formInnerClass}>
                <ReferenceFormContent {...contentProps} />
              </form>
            ) : (
              <form id={vm.formId} noValidate onSubmit={vm.handleCreateSubmit} className={formInnerClass}>
                <ReferenceFormContent {...contentProps} />
              </form>
            )}
          </div>
          {actionBar}
        </>
      ) : (
        <>
          {vm.isEditMode ? (
            <form id={vm.formId} noValidate onSubmit={vm.handleEditSubmit} className={formInnerClass}>
              <ReferenceFormContent {...contentProps} />
            </form>
          ) : (
            <form id={vm.formId} noValidate onSubmit={vm.handleCreateSubmit} className={formInnerClass}>
              <ReferenceFormContent {...contentProps} />
            </form>
          )}
          {actionBar}
        </>
      )}
    </div>
  )
}


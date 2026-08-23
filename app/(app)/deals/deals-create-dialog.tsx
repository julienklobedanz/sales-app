'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { DealForm } from './new/deal-form'

export function DealsCreateDialog({
  open,
  onOpenChange,
  companies,
  orgProfiles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: { id: string; name: string }[]
  orgProfiles: { id: string; full_name: string | null }[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] min-h-[60vh] overflow-y-auto w-[calc(100vw-2rem)] max-w-[90vw] lg:max-w-7xl gap-0 border-0 px-6 py-6 md:px-12 md:py-10 lg:px-16 lg:py-12">
        <div className="flex flex-col items-center w-full max-w-full">
          <DialogHeader className="w-full max-w-4xl mx-auto px-0 pb-4">
            <DialogTitle>Deal anlegen</DialogTitle>
          </DialogHeader>
          <div className="w-full max-w-4xl">
            <DealForm companies={companies} orgProfiles={orgProfiles} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

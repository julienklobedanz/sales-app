'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { DeletedReferenceRow, ReferenceRow } from '@/app/(app)/actions'
import type { Profile } from '@/app/(app)/dashboard-types'
import {
  BulkImportDialog,
  type BulkImportGroupItem,
} from '@/app/(app)/references/components/bulk-import-dialog'
import { BulkDeleteReferencesDialog } from '@/app/(app)/references/components/bulk-delete-references-dialog'
import { NewReferenceDialog } from '@/app/(app)/references/components/new-reference-dialog'
import { ShareLinkDialog } from '@/app/(app)/references/components/share-link-dialog'
import { TrashDialog } from '@/app/(app)/references/components/trash-dialog'
import { isSystemAdmin } from '@/lib/roles/capability-access'

type CompanyOption = {
  id: string
  name: string
  logo_url?: string | null
  industry?: string | null
}
type ContactOption = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}
type ExternalContactOption = {
  id: string
  company_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  phone?: string | null
}

export type ReferencesOverviewDialogsProps = {
  profile: Profile
  companies: CompanyOption[]
  contacts: ContactOption[]
  externalContacts: ExternalContactOption[]
  deletedCount: number
  trashOpen: boolean
  setTrashOpen: (open: boolean) => void
  trashLoading: boolean
  trashItems: DeletedReferenceRow[]
  setTrashItems: Dispatch<SetStateAction<DeletedReferenceRow[]>>
  confirmEmptyOpen: boolean
  setConfirmEmptyOpen: Dispatch<SetStateAction<boolean>>
  emptyingTrash: boolean
  setEmptyingTrash: Dispatch<SetStateAction<boolean>>
  shareLinkPopoverRef: ReferenceRow | null
  setShareLinkPopoverRef: (ref: ReferenceRow | null) => void
  newRefModalOpen: boolean
  setNewRefModalOpen: (open: boolean) => void
  bulkImportOpen: boolean
  setBulkImportOpen: (open: boolean) => void
  setBulkImportLoading: (loading: boolean) => void
  setBulkImportPreviewPendingFiles: Dispatch<SetStateAction<Set<File>>>
  bulkImportLoading: boolean
  bulkImportGroups: BulkImportGroupItem[]
  setBulkImportGroups: Dispatch<SetStateAction<BulkImportGroupItem[]>>
  bulkImportDropRef: RefObject<HTMLInputElement | null>
  addBulkImportFiles: (files: File[]) => void
  removeBulkImportFile: (groupId: string, fileIndex: number) => void
  moveBulkImportFile: (fromGroupId: string, fileIndex: number, toGroupId: string) => void
  setBulkImportGroupName: (groupId: string, projectName: string) => void
  setBulkImportCompanyName: (groupId: string, companyName: string) => void
  mergeBulkImportGroups: (selectedIds: string[]) => void
  bulkImportPreviewPendingFiles: Set<File>
  bulkDeleteConfirmOpen: boolean
  setBulkDeleteConfirmOpen: (open: boolean) => void
  selectedRefIds: Set<string>
  setSelectedRefIds: Dispatch<SetStateAction<Set<string>>>
  bulkDeleteLoading: boolean
  setBulkDeleteLoading: Dispatch<SetStateAction<boolean>>
}

export function ReferencesOverviewDialogs(props: ReferencesOverviewDialogsProps) {
  const {
    profile,
    companies,
    contacts,
    externalContacts,
    deletedCount,
    trashOpen,
    setTrashOpen,
    trashLoading,
    trashItems,
    setTrashItems,
    confirmEmptyOpen,
    setConfirmEmptyOpen,
    emptyingTrash,
    setEmptyingTrash,
    shareLinkPopoverRef,
    setShareLinkPopoverRef,
    newRefModalOpen,
    setNewRefModalOpen,
    bulkImportOpen,
    setBulkImportOpen,
    setBulkImportLoading,
    setBulkImportPreviewPendingFiles,
    bulkImportLoading,
    bulkImportGroups,
    setBulkImportGroups,
    bulkImportDropRef,
    addBulkImportFiles,
    removeBulkImportFile,
    moveBulkImportFile,
    setBulkImportGroupName,
    setBulkImportCompanyName,
    mergeBulkImportGroups,
    bulkImportPreviewPendingFiles,
    bulkDeleteConfirmOpen,
    setBulkDeleteConfirmOpen,
    selectedRefIds,
    setSelectedRefIds,
    bulkDeleteLoading,
    setBulkDeleteLoading,
  } = props

  const isAdmin = isSystemAdmin(profile.systemRole)

  return (
    <>
      {isAdmin ? (
        <BulkDeleteReferencesDialog
          open={bulkDeleteConfirmOpen}
          onOpenChange={setBulkDeleteConfirmOpen}
          ids={Array.from(selectedRefIds)}
          loading={bulkDeleteLoading}
          onLoadingChange={setBulkDeleteLoading}
          onSuccess={() => {
            setSelectedRefIds(new Set())
            setBulkDeleteConfirmOpen(false)
          }}
        />
      ) : null}

      <TrashDialog
        open={trashOpen}
        onOpenChange={(open) => {
          setTrashOpen(open)
          if (!open) {
            setTrashItems([])
          }
        }}
        deletedCount={deletedCount}
        trashLoading={trashLoading}
        trashItems={trashItems}
        setTrashItems={setTrashItems}
        confirmEmptyOpen={confirmEmptyOpen}
        setConfirmEmptyOpen={setConfirmEmptyOpen}
        emptyingTrash={emptyingTrash}
        setEmptyingTrash={setEmptyingTrash}
      />

      <ShareLinkDialog
        reference={shareLinkPopoverRef}
        onClose={() => setShareLinkPopoverRef(null)}
      />

      {isAdmin ? (
        <>
          <NewReferenceDialog
            open={newRefModalOpen}
            onOpenChange={setNewRefModalOpen}
            companies={companies}
            contacts={contacts}
            externalContacts={externalContacts}
          />
          <BulkImportDialog
            open={bulkImportOpen}
            onOpenChange={(open) => {
              if (!open) {
                setBulkImportLoading(false)
                setBulkImportPreviewPendingFiles(new Set())
              }
              setBulkImportOpen(open)
            }}
            loading={bulkImportLoading}
            onLoadingChange={setBulkImportLoading}
            groups={bulkImportGroups}
            setGroups={setBulkImportGroups}
            dropRef={bulkImportDropRef}
            addFiles={addBulkImportFiles}
            removeFile={removeBulkImportFile}
            moveFile={moveBulkImportFile}
            setGroupName={setBulkImportGroupName}
            setCompanyName={setBulkImportCompanyName}
            mergeSelectedGroups={mergeBulkImportGroups}
            previewPendingFiles={bulkImportPreviewPendingFiles}
          />
        </>
      ) : null}
    </>
  )
}

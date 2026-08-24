'use client'

import { useRef, useState } from 'react'
import type { DeletedReferenceRow, ReferenceRow } from '@/app/(app)/actions'
import type { Profile } from '@/app/(app)/dashboard-types'
import {
  addBulkImportFiles as addBulkImportFilesHelper,
  mergeBulkImportGroups as mergeBulkImportGroupsHelper,
  moveBulkImportFile as moveBulkImportFileHelper,
  removeBulkImportFile as removeBulkImportFileHelper,
  setBulkImportCompanyName as setBulkImportCompanyNameHelper,
  setBulkImportGroupName as setBulkImportGroupNameHelper,
} from '@/app/(app)/overview/bulk-import-file-helpers'
import type { BulkImportGroupItem } from '@/app/(app)/overview/bulk-import-types'
import {
  ReferencesOverviewDialogs,
  type ReferencesOverviewDialogsProps,
} from '@/app/(app)/overview/references-overview-dialogs'

type CompanyOption = ReferencesOverviewDialogsProps['companies'][number]
type ContactOption = ReferencesOverviewDialogsProps['contacts'][number]
type ExternalContactOption = ReferencesOverviewDialogsProps['externalContacts'][number]

export function useReferencesOverviewDialogsState() {
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [bulkImportGroups, setBulkImportGroups] = useState<BulkImportGroupItem[]>([])
  const [bulkImportLoading, setBulkImportLoading] = useState(false)
  const [bulkImportPreviewPendingFiles, setBulkImportPreviewPendingFiles] = useState<
    Set<File>
  >(() => new Set())
  const bulkImportDropRef = useRef<HTMLInputElement>(null)
  const [trashOpen, setTrashOpen] = useState(false)
  const [trashItems, setTrashItems] = useState<DeletedReferenceRow[]>([])
  const trashLoading = false
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false)
  const [emptyingTrash, setEmptyingTrash] = useState(false)
  const [newRefModalOpen, setNewRefModalOpen] = useState(false)
  const [shareLinkPopoverRef, setShareLinkPopoverRef] = useState<ReferenceRow | null>(
    null,
  )
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(() => new Set())

  function addBulkImportFiles(newFiles: File[]) {
    addBulkImportFilesHelper(
      newFiles,
      setBulkImportGroups,
      setBulkImportPreviewPendingFiles,
    )
  }
  function removeBulkImportFile(groupId: string, fileIndex: number) {
    removeBulkImportFileHelper(groupId, fileIndex, setBulkImportGroups)
  }
  function moveBulkImportFile(fromGroupId: string, fileIndex: number, toGroupId: string) {
    moveBulkImportFileHelper(fromGroupId, fileIndex, toGroupId, setBulkImportGroups)
  }
  function setBulkImportGroupName(groupId: string, projectName: string) {
    setBulkImportGroupNameHelper(groupId, projectName, setBulkImportGroups)
  }
  function setBulkImportCompanyName(groupId: string, companyName: string) {
    setBulkImportCompanyNameHelper(groupId, companyName, setBulkImportGroups)
  }
  function mergeBulkImportGroups(selectedIds: string[]) {
    mergeBulkImportGroupsHelper(selectedIds, setBulkImportGroups)
  }

  function renderDialogs(args: {
    profile: Profile
    companies: CompanyOption[]
    contacts: ContactOption[]
    externalContacts: ExternalContactOption[]
    deletedCount: number
  }) {
    return (
      <ReferencesOverviewDialogs
        profile={args.profile}
        companies={args.companies}
        contacts={args.contacts}
        externalContacts={args.externalContacts}
        deletedCount={args.deletedCount}
        trashOpen={trashOpen}
        setTrashOpen={setTrashOpen}
        trashLoading={trashLoading}
        trashItems={trashItems}
        setTrashItems={setTrashItems}
        confirmEmptyOpen={confirmEmptyOpen}
        setConfirmEmptyOpen={setConfirmEmptyOpen}
        emptyingTrash={emptyingTrash}
        setEmptyingTrash={setEmptyingTrash}
        shareLinkPopoverRef={shareLinkPopoverRef}
        setShareLinkPopoverRef={setShareLinkPopoverRef}
        newRefModalOpen={newRefModalOpen}
        setNewRefModalOpen={setNewRefModalOpen}
        bulkImportOpen={bulkImportOpen}
        setBulkImportOpen={setBulkImportOpen}
        setBulkImportLoading={setBulkImportLoading}
        setBulkImportPreviewPendingFiles={setBulkImportPreviewPendingFiles}
        bulkImportLoading={bulkImportLoading}
        bulkImportGroups={bulkImportGroups}
        setBulkImportGroups={setBulkImportGroups}
        bulkImportDropRef={bulkImportDropRef}
        addBulkImportFiles={addBulkImportFiles}
        removeBulkImportFile={removeBulkImportFile}
        moveBulkImportFile={moveBulkImportFile}
        setBulkImportGroupName={setBulkImportGroupName}
        setBulkImportCompanyName={setBulkImportCompanyName}
        mergeBulkImportGroups={mergeBulkImportGroups}
        bulkImportPreviewPendingFiles={bulkImportPreviewPendingFiles}
        bulkDeleteConfirmOpen={bulkDeleteConfirmOpen}
        setBulkDeleteConfirmOpen={setBulkDeleteConfirmOpen}
        selectedRefIds={selectedRefIds}
        setSelectedRefIds={setSelectedRefIds}
        bulkDeleteLoading={bulkDeleteLoading}
        setBulkDeleteLoading={setBulkDeleteLoading}
      />
    )
  }

  return {
    bulkImportOpen,
    setBulkImportOpen,
    bulkImportGroups,
    setBulkImportGroups,
    addBulkImportFiles,
    newRefModalOpen,
    setNewRefModalOpen,
    setShareLinkPopoverRef,
    bulkDeleteConfirmOpen,
    setBulkDeleteConfirmOpen,
    selectedRefIds,
    setSelectedRefIds,
    setBulkDeleteLoading,
    renderDialogs,
  }
}

'use client'

import { Download, Link2, Trash2 } from 'lucide-react'

import {
  TableBulkActionsBar,
  type TableBulkActionItem,
} from '@/components/table/table-bulk-actions-bar'

type Props = {
  selectedCount: number
  showSalesActions: boolean
  showAdminDelete: boolean
  onClearSelection: () => void
  onBulkDelete: () => void
  onCreateSharedPortfolio: () => void
  onDownloadPdfs: () => void
}

export function ReferencesBulkActionsBar({
  selectedCount,
  showSalesActions,
  showAdminDelete,
  onClearSelection,
  onBulkDelete,
  onCreateSharedPortfolio,
  onDownloadPdfs,
}: Props) {
  const actions: TableBulkActionItem[] = [
    {
      id: 'portfolio',
      label: 'Kollektions-Link',
      icon: Link2,
      onClick: onCreateSharedPortfolio,
      hidden: !showSalesActions,
    },
    {
      id: 'download',
      label: 'Herunterladen',
      icon: Download,
      onClick: onDownloadPdfs,
    },
    {
      id: 'delete',
      label: 'Löschen',
      icon: Trash2,
      onClick: onBulkDelete,
      variant: 'destructive',
      hidden: !showAdminDelete,
    },
  ]

  return (
    <TableBulkActionsBar
      selectedCount={selectedCount}
      onClearSelection={onClearSelection}
      actions={actions}
    />
  )
}

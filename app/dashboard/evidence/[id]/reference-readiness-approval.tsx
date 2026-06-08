'use client'

import { useEffect } from 'react'
import { Mail } from '@hugeicons/core-free-icons'
import { AppIcon } from '@/lib/icons'
import { RequestApprovalDialog } from './request-approval-dialog'

type Props = {
  referenceId: string
  role: 'admin' | 'sales' | 'account_manager'
  referenceStatus: string
  canStart: boolean
  defaultAccountManagerEmail?: string | null
  autoOpen?: boolean
}

export function ReferenceReadinessApproval({
  referenceId,
  canStart,
  defaultAccountManagerEmail,
  autoOpen = false,
}: Props) {
  useEffect(() => {
    if (!autoOpen || !canStart) return
    const el = document.getElementById('reference-readiness-approval-trigger')
    el?.click()
  }, [autoOpen, canStart])

  if (!canStart) {
    return null
  }

  return (
    <RequestApprovalDialog
      referenceId={referenceId}
      defaultAccountManagerEmail={defaultAccountManagerEmail}
      triggerIcon={<AppIcon icon={Mail} size={16} />}
      triggerId="reference-readiness-approval-trigger"
      triggerVariant="default"
      triggerClassName="w-full max-w-xs"
    />
  )
}

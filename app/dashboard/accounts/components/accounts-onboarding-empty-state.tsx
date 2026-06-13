'use client'

import {
  CrmOnboardingEmptyState,
  type CrmOnboardingEmptyStateProps,
} from '@/app/dashboard/components/crm-onboarding-empty-state'

type AccountsOnboardingEmptyStateProps = Omit<CrmOnboardingEmptyStateProps, 'variant'> & {
  onConnectHubSpot?: () => void
}

export function AccountsOnboardingEmptyState({
  onConnectHubSpot,
  onHubSpotClick,
  ...props
}: AccountsOnboardingEmptyStateProps) {
  return (
    <CrmOnboardingEmptyState
      variant="accounts"
      onHubSpotClick={onHubSpotClick ?? onConnectHubSpot}
      {...props}
    />
  )
}

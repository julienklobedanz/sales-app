export const SYSTEM_ROLES = ['owner', 'admin', 'member', 'viewer'] as const
export type SystemRole = (typeof SYSTEM_ROLES)[number]

export const FUNCTION_ROLES = ['sales_rep', 'account_manager', 'sales_leader'] as const
export type FunctionRole = (typeof FUNCTION_ROLES)[number]

export const CAPABILITIES = [
  'create_reference',
  'edit_any_reference',
  'approve_internal',
  'start_customer_approval',
  'anonymize_reference',
  'manage_reference_program',
  'see_draft_references',
  'see_confidential_references',
  'view_analytics_all',
  'view_analytics_own',
  'export_marketing_library',
  'manage_team',
  'manage_settings',
  'manage_integrations',
] as const

export type Capability = (typeof CAPABILITIES)[number]

export const FUNCTION_ROLE_CAPS: Record<FunctionRole, Capability[]> = {
  sales_rep: ['view_analytics_own'],
  account_manager: [
    'create_reference',
    'approve_internal',
    'start_customer_approval',
    'anonymize_reference',
    'see_draft_references',
    'see_confidential_references',
    'view_analytics_own',
  ],
  sales_leader: ['view_analytics_all'],
}

export const ADMIN_CAPS: Capability[] = [
  'create_reference',
  'edit_any_reference',
  'approve_internal',
  'start_customer_approval',
  'anonymize_reference',
  'see_draft_references',
  'see_confidential_references',
  'view_analytics_all',
  'manage_team',
  'manage_settings',
  'manage_integrations',
]

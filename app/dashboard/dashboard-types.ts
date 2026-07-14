import type { AppRole, Capability, FunctionRole, SystemRole } from '@/hooks/useRole'

export type Profile = {
  full_name: string | null
  role: AppRole
  systemRole: SystemRole
  functionRole: FunctionRole
  capabilities: Partial<Record<Capability, boolean>>
}

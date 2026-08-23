import type { Capability, FunctionRole, SystemRole } from '@/hooks/useRole'

export type Profile = {
  full_name: string | null
  systemRole: SystemRole
  functionRole: FunctionRole
  capabilities: Partial<Record<Capability, boolean>>
}

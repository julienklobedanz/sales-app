'use client'

import * as React from 'react'

import type { Capability, FunctionRole, SystemRole } from '@/lib/roles/capabilities'
import { hasCapability } from '@/lib/roles/legacy-mapping'
import { legacyAppRoleFrom } from '@/lib/roles/legacy-mapping'
import type { AppRole } from '@/lib/roles/types'

export type { AppRole, SystemRole, FunctionRole, Capability }

export type RoleContextValue = {
  systemRole: SystemRole
  functionRole: FunctionRole
  capabilities: Partial<Record<Capability, boolean>>
  /** Abgeleitete Legacy-Rolle — Übergangsphase, deprecated */
  role: AppRole
}

const RoleContext = React.createContext<RoleContextValue | null>(null)

export function RoleProvider({
  systemRole,
  functionRole,
  capabilities = {},
  children,
}: React.PropsWithChildren<{
  systemRole: SystemRole
  functionRole: FunctionRole
  capabilities?: Partial<Record<Capability, boolean>>
}>) {
  const role = legacyAppRoleFrom(systemRole, functionRole)
  return (
    <RoleContext.Provider value={{ systemRole, functionRole, capabilities, role }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const ctx = React.useContext(RoleContext)
  if (!ctx) {
    throw new Error('useRole must be used within a RoleProvider.')
  }
  const isOwner = ctx.systemRole === 'owner'
  const isAdmin = ctx.systemRole === 'owner' || ctx.systemRole === 'admin'
  const isSales = ctx.functionRole === 'sales_rep'
  const isAccountManager = ctx.functionRole === 'account_manager'
  const can = (cap: Capability) =>
    hasCapability(ctx.functionRole, ctx.systemRole, ctx.capabilities, cap)
  return { ...ctx, isOwner, isAdmin, isAccountManager, isSales, can }
}

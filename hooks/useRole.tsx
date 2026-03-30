"use client"

import * as React from "react"

export type AppRole = "admin" | "sales" | "account_manager"

export type RoleContextValue = {
  role: AppRole
}

const RoleContext = React.createContext<RoleContextValue | null>(null)

export function RoleProvider({
  role,
  children,
}: React.PropsWithChildren<{ role: AppRole }>) {
  return <RoleContext.Provider value={{ role }}>{children}</RoleContext.Provider>
}

export function useRole() {
  const ctx = React.useContext(RoleContext)
  if (!ctx) {
    throw new Error("useRole must be used within a RoleProvider.")
  }
  const isAdmin = ctx.role === "admin"
  const isAccountManager = ctx.role === "account_manager"
  const isSales = ctx.role === "sales"
  return { ...ctx, isAdmin, isAccountManager, isSales }
}


"use client"

import * as React from "react"
import { SearchIcon } from "@hugeicons/core-free-icons"

import { Input } from "@/components/ui/input"
import { AppIcon } from "@/lib/icons"
import { TABLE_TOOLBAR } from "@/lib/table-toolbar"
import { cn } from "@/lib/utils"

export type ToolbarSearchFieldVariant = "list" | "dashboard"

export type ToolbarSearchFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange"
> & {
  value: string
  onChange: (value: string) => void
  /**
   * `list`: h-10, max-w-xl (AppDataTable).
   * `dashboard`: h-11, rounded-lg (Übersicht, Accounts).
   */
  variant?: ToolbarSearchFieldVariant
  /** Am äußeren Wrapper, z. B. `min-w-0 flex-1` für die Dashboard-Toolbar */
  wrapperClassName?: string
}

export function ToolbarSearchField({
  value,
  onChange,
  variant = "list",
  wrapperClassName,
  className,
  ...inputProps
}: ToolbarSearchFieldProps) {
  const wrap =
    variant === "list"
      ? cn(TABLE_TOOLBAR.list.searchWrap, wrapperClassName)
      : cn("relative w-full", wrapperClassName)

  const inputClass =
    variant === "list"
      ? cn(TABLE_TOOLBAR.list.searchInput, className)
      : cn(TABLE_TOOLBAR.dashboard.searchInput, className)

  return (
    <div className={wrap}>
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        <AppIcon icon={SearchIcon} size={16} />
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        {...inputProps}
      />
    </div>
  )
}

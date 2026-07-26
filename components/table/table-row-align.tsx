'use client'

import type * as React from 'react'

import { TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'

/** Einheitliche Innenhöhe pro Datenzeile (entspricht Logo/Checkbox). */
export const TABLE_ROW_INNER_HEIGHT_CLASS = 'min-h-9'

export const TABLE_DATA_CELL_CLASS = 'align-middle p-2'

export function TableRowAlign({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex w-full min-w-0 items-center', TABLE_ROW_INNER_HEIGHT_CLASS, className)}>
      {children}
    </div>
  )
}

export function TableDataCell({
  children,
  className,
  alignClassName,
  ...props
}: React.ComponentProps<typeof TableCell> & {
  alignClassName?: string
}) {
  return (
    <TableCell className={cn(TABLE_DATA_CELL_CLASS, className)} {...props}>
      <TableRowAlign className={alignClassName}>{children}</TableRowAlign>
    </TableCell>
  )
}

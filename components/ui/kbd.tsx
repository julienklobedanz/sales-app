"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-6 items-center gap-1 rounded-md border px-2 font-mono text-[11px] font-medium",
        className
      )}
      {...props}
    />
  )
}


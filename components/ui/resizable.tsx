"use client"

import * as React from "react"
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
  type PanelProps,
  type SeparatorProps,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof PanelGroup> & {
  direction?: "horizontal" | "vertical"
}) {
  return (
    <PanelGroup
      data-slot="resizable-panel-group"
      className={cn("flex h-full w-full", className)}
      {...(props as React.ComponentProps<typeof PanelGroup>)}
    />
  )
}

function ResizablePanel({
  className,
  ...props
}: PanelProps) {
  return (
    <Panel
      data-slot="resizable-panel"
      className={cn("min-w-0 min-h-0", className)}
      {...props}
    />
  )
}

function ResizableHandle({
  className,
  withHandle = false,
  ...props
}: SeparatorProps & {
  withHandle?: boolean
}) {
  return (
    <PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div
          className={cn(
            "bg-border ring-background z-10 flex h-8 w-3 items-center justify-center rounded-sm border",
            "data-[panel-group-direction=vertical]:h-3 data-[panel-group-direction=vertical]:w-8"
          )}
        />
      ) : null}
    </PanelResizeHandle>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }


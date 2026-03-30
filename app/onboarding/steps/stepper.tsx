"use client"

import { cn } from "@/lib/utils"

export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[]
  current: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      {steps.map((label, idx) => {
        const isActive = idx === current
        const isDone = idx < current
        return (
          <div key={label} className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                isDone && "bg-primary text-primary-foreground border-primary",
                isActive && "border-primary text-primary",
                !isDone && !isActive && "text-muted-foreground"
              )}
            >
              {idx + 1}
            </div>
            <div className={cn("text-sm font-medium truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </div>
            {idx < steps.length - 1 ? (
              <div className={cn("h-px flex-1 bg-border", isDone ? "bg-primary/40" : "bg-border")} />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}


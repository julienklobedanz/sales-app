"use client"

import Image from "next/image"
import { Building2 } from "@hugeicons/core-free-icons"

import { AppIcon } from "@/lib/icons"

export function AccountCell({
  companyName,
  companyLogoUrl,
}: {
  companyName: string | null | undefined
  companyLogoUrl: string | null | undefined
}) {
  return (
    <div className="flex min-w-0 max-w-[260px] items-center gap-2.5">
      {companyLogoUrl ? (
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted/30">
          <Image
            src={companyLogoUrl}
            alt=""
            fill
            className="object-contain"
            sizes="36px"
          />
        </div>
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/30">
          <AppIcon icon={Building2} size={18} className="text-muted-foreground" />
        </div>
      )}
      <span className="truncate font-semibold text-foreground">{companyName ?? "—"}</span>
    </div>
  )
}


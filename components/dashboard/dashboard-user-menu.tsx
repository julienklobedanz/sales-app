'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Check } from 'lucide-react'
import { LogOut, Moon, SettingsIcon, Sun } from '@hugeicons/core-free-icons'

import {
  clearDevPreviewRole,
  setDevPreviewRole,
} from '@/app/dashboard/dev-preview-role-actions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { useHydrated } from '@/hooks/use-hydrated'
import { useRole } from '@/hooks/useRole'
import { formatRoleDimensionsLabel } from '@/lib/roles/invite-roles'
import {
  DEV_ROLE_PRESETS,
  formatDevRolePreviewLabel,
  type DevRolePreview,
} from '@/lib/dev-role-preview'
import { AppIcon } from '@/lib/icons'
import { COPY } from '@/lib/copy'
import { ROUTES } from '@/lib/routes'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function DashboardUserMenu({
  userName,
  userEmail,
  userInitials,
  devRolePreviewEnabled = false,
  devRolePreviewActive = false,
  compact = false,
}: {
  userName: string
  userEmail: string
  userInitials: string
  devRolePreviewEnabled?: boolean
  devRolePreviewActive?: boolean
  compact?: boolean
}) {
  const router = useRouter()
  const hydrated = useHydrated()
  const { resolvedTheme, setTheme } = useTheme()
  const { systemRole, functionRole } = useRole()
  const [roleSwitchPending, startRoleSwitch] = useTransition()

  const handleLogout = async () => {
    await clearDevPreviewRole()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(ROUTES.login)
  }

  function selectDevRole(preview: DevRolePreview) {
    startRoleSwitch(async () => {
      const res = await setDevPreviewRole(preview)
      if (!res.success) {
        toast.error(res.error ?? 'Rolle konnte nicht gesetzt werden.')
        return
      }
      toast.success(COPY.roleSwitcher.switchSuccess)
      router.refresh()
    })
  }

  function resetDevRole() {
    startRoleSwitch(async () => {
      const res = await clearDevPreviewRole()
      if (!res.success) {
        toast.error(res.error ?? 'Anzeige konnte nicht zurückgesetzt werden.')
        return
      }
      toast.success(COPY.roleSwitcher.switchSuccess)
      router.refresh()
    })
  }

  const menuContent = (
    <DropdownMenuContent
      className="min-w-56 rounded-lg shadow-xl"
      side="top"
      align="start"
      sideOffset={8}
    >
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{userName}</span>
            <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
            <span className="mt-1 inline-flex w-fit rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
              {formatRoleDimensionsLabel(systemRole, functionRole)}
            </span>
          </div>
        </div>
      </DropdownMenuLabel>
      {devRolePreviewEnabled ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {COPY.roleSwitcher.profileMenuSectionTitle}
          </DropdownMenuLabel>
          {DEV_ROLE_PRESETS.map((preset) => {
            const active =
              preset.systemRole === systemRole && preset.functionRole === functionRole
            const label = formatDevRolePreviewLabel(preset)
            return (
              <DropdownMenuItem
                key={`${preset.systemRole}:${preset.functionRole}`}
                disabled={roleSwitchPending}
                onSelect={() => selectDevRole(preset)}
                className={cn('cursor-pointer', active && 'bg-accent font-medium')}
              >
                {active ? <Check className="mr-2 size-4 shrink-0" aria-hidden /> : null}
                <span className={cn(!active && 'pl-6')}>
                  {label}
                  {active ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({COPY.roleSwitcher.profileMenuActiveSuffix})
                    </span>
                  ) : null}
                </span>
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuItem
            disabled={roleSwitchPending || !devRolePreviewActive}
            onSelect={resetDevRole}
            className="cursor-pointer text-muted-foreground"
          >
            {COPY.roleSwitcher.profileMenuReset}
          </DropdownMenuItem>
          <p className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
            {COPY.roleSwitcher.profileMenuHint}
          </p>
          <DropdownMenuSeparator />
        </>
      ) : null}
      <DropdownMenuGroup>
        <DropdownMenuItem
          onSelect={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? (
            <AppIcon icon={Sun} size={16} className="mr-2" />
          ) : (
            <AppIcon icon={Moon} size={16} className="mr-2" />
          )}
          Theme umschalten
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push(ROUTES.settings)}>
          <AppIcon icon={SettingsIcon} size={16} className="mr-2" />
          Account
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={handleLogout}
        className="text-destructive focus:text-destructive"
      >
        <AppIcon icon={LogOut} size={16} className="mr-2" />
        Abmelden
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  if (!hydrated) {
    if (compact) {
      return (
        <button
          type="button"
          className="shell-sidebar-icon-btn overflow-hidden p-0"
          tabIndex={-1}
          aria-label={userName}
        >
          <Avatar className="size-7 rounded-md">
            <AvatarFallback className="rounded-md text-xs">{userInitials}</AvatarFallback>
          </Avatar>
        </button>
      )
    }

    return (
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="rounded-xl" tabIndex={-1}>
          <Avatar className="h-7 w-7 rounded-lg">
            <AvatarFallback className="rounded-lg text-xs">{userInitials}</AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">{userName}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="shell-sidebar-icon-btn overflow-hidden p-0 hover:bg-muted/60 data-[state=open]:bg-muted"
            aria-label={userName}
          >
            <Avatar className="size-7 rounded-md">
              <AvatarFallback className="rounded-md text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    )
  }

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            tooltip={userName}
            className="rounded-xl px-2 py-2 hover:bg-muted/60 data-[state=open]:bg-muted"
          >
            <Avatar className="h-7 w-7 shrink-0 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate font-medium">{userName}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

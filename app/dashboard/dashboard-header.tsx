'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { UserIcon, LogOutIcon, SlashIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export function DashboardHeader() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const pathSegments = pathname?.split('/').filter(Boolean) || []

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          <nav className="text-muted-foreground flex items-center text-sm font-medium">
            <button
              type="button"
              className="hover:text-foreground transition-colors"
              onClick={() => router.push('/dashboard')}
            >
              Refstack
            </button>
            {pathSegments.slice(1).map((segment) => (
              <div key={segment} className="flex items-center">
                <SlashIcon className="text-muted-foreground/50 mx-2 size-3" />
                <span className="text-foreground capitalize">{segment}</span>
              </div>
            ))}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-2 px-4">
          <Button
            variant="outline"
            className="text-muted-foreground hover:bg-muted/50 relative h-9 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal shadow-none sm:pr-12 md:w-40 lg:w-64"
            onClick={() => setOpen(true)}
          >
            <span className="hidden lg:inline-flex">Suchen...</span>
            <span className="inline-flex lg:hidden">Suchen...</span>
            <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <UserIcon className="size-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mein Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onSelect={handleLogout}
              >
                <LogOutIcon className="mr-2 size-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandDialog open={open} onOpenChange={setOpen} title="Suchen">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Aktionen">
            <CommandItem
              onSelect={() => {
                router.push('/dashboard/new')
                setOpen(false)
              }}
            >
              Neue Referenz erstellen
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

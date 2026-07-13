'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import { useHydrated } from '@/hooks/use-hydrated'

type AuthThemeToggleProps = {
  /** Auf dem dunklen Brand-Panel (animierter Bereich) */
  variant?: 'default' | 'brand'
}

export function AuthThemeToggle({ variant = 'default' }: AuthThemeToggleProps) {
  const hydrated = useHydrated()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const isBrand = variant === 'brand'

  if (!hydrated) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`size-9 shrink-0 ${isBrand ? 'text-zinc-400' : 'text-zinc-500'}`}
        disabled
        aria-hidden
      />
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={
        isBrand
          ? 'size-9 shrink-0 text-zinc-400 hover:bg-white/10 hover:text-white'
          : 'size-9 shrink-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
      }
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren'}
      title={isDark ? 'Hellmodus' : 'Dunkelmodus'}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}

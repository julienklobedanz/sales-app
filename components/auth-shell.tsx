import Link from 'next/link'

import { AuthBrandPanel, type AuthBrandContent } from '@/components/auth-brand-panel'
import { AuthThemeScope } from '@/components/auth-theme-scope'

type AuthShellProps = {
  children: React.ReactNode
  brandContent: AuthBrandContent
  /** Link oben rechts (z. B. "Anmelden" auf Registrieren) */
  topRightLink?: { href: string; label: string }
}

/** Formularspalte bleibt immer hell — unabhängig vom globalen Dark Mode. */
const AUTH_FORM_COLUMN_CLASS =
  'relative flex min-h-screen flex-col items-center justify-center bg-white px-8 py-10 text-foreground lg:px-16 dark:bg-white dark:text-foreground [&_[data-slot=input]]:border-border [&_[data-slot=input]]:bg-white [&_[data-slot=input]]:text-foreground [&_[data-slot=input]]:shadow-sm [&_[data-slot=input]]:placeholder:text-muted-foreground dark:[&_[data-slot=input]]:border-border dark:[&_[data-slot=input]]:bg-white dark:[&_[data-slot=input]]:text-foreground dark:[&_[data-slot=input]]:placeholder:text-muted-foreground [&_[data-slot=label]]:text-foreground dark:[&_[data-slot=label]]:text-foreground [&_.bg-border]:bg-accent dark:[&_.bg-border]:bg-accent'

export function AuthShell({ children, brandContent, topRightLink }: AuthShellProps) {
  return (
    <AuthThemeScope>
      <div className="min-h-screen overflow-hidden bg-accent">
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
          <div className={AUTH_FORM_COLUMN_CLASS}>
            {topRightLink ? (
              <div className="absolute right-4 top-4 md:right-8 md:top-8 lg:top-12">
                <Link
                  href={topRightLink.href}
                  className="px-2 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {topRightLink.label}
                </Link>
              </div>
            ) : null}
            <div className="mx-auto w-full max-w-sm">{children}</div>
          </div>

          <AuthBrandPanel content={brandContent} />
        </div>
      </div>
    </AuthThemeScope>
  )
}

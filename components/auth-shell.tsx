import Link from 'next/link'

type AuthShellProps = {
  children: React.ReactNode
  /** Link oben rechts (z. B. "Registrieren" auf Login-Seite) */
  topRightLink: { href: string; label: string }
  /** Optional: zusätzliche query params für den Link (z. B. invite) */
  topRightLinkSearch?: string
}

export function AuthShell({ children, topRightLink, topRightLinkSearch }: AuthShellProps) {
  const href = topRightLinkSearch ? `${topRightLink.href}${topRightLinkSearch}` : topRightLink.href
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Linke Seite: Branding-Panel (Wireframe §26) */}
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground border-r border-sidebar-border/60 p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground text-sm font-black shadow-sm">
            R
          </div>
          <div className="leading-tight">
            <div className="text-lg font-semibold">Refstack</div>
            <div className="text-sm text-muted-foreground">Dein Beweis. Dein Deal.</div>
          </div>
        </div>

        <div className="max-w-md">
          <div className="text-3xl font-semibold tracking-tight">
            Orientierung ab dem ersten Klick.
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Registrierung, Arbeitsbereich-Setup und erste Referenz in wenigen Minuten – inklusive Team-Einladung.
          </p>
        </div>
      </div>

      {/* Rechte Seite: Formular */}
      <div className="flex flex-col items-center justify-center p-4 md:p-8 relative">
        <div className="absolute right-4 top-4 md:right-8 md:top-8">
          <Link
            href={href}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {topRightLink.label}
          </Link>
        </div>
        <div className="w-full max-w-[360px]">{children}</div>
      </div>
    </div>
  )
}

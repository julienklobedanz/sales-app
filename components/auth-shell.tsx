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
    <div className="min-h-screen grid lg:grid-cols-[0.34fr_0.66fr]">
      {/* Linke Seite: Branding-Panel (Wireframe §26) */}
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground border-r border-sidebar-border/60 p-10 xl:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground text-sm font-black shadow-sm">
            R
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold">RefStack</div>
            <div className="text-sm text-muted-foreground">
              Know your references. Win more deals.
            </div>
          </div>
        </div>

        <div className="max-w-lg">
          <div className="text-3xl font-semibold tracking-tight">Move deals faster.</div>
          <p className="mt-3 text-sm text-muted-foreground">
            One workspace for your references, account strategy, curated news on your targets and
            live executive tracking. Sharp information. From first call to close.
          </p>
        </div>
      </div>

      {/* Rechte Seite: Formular */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 xl:p-12 relative">
        <div className="absolute right-4 top-4 md:right-8 md:top-8">
          <Link
            href={href}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {topRightLink.label}
          </Link>
        </div>
        <div className="w-full max-w-[520px]">{children}</div>
      </div>
    </div>
  )
}

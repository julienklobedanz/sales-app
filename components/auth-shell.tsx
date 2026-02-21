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
    <div className="min-h-screen flex">
      {/* Linke Seite: Branding + Testimonial */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-between bg-muted/50 p-10 text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            R
          </div>
          <span className="text-lg font-semibold text-foreground">Refstack</span>
        </div>
        <blockquote className="mt-auto space-y-2">
          <p className="text-sm leading-relaxed">
            „Referenzen verwalten, Freigaben einholen und alles an einem Ort – Refstack spart uns Zeit und behält den Überblick.“
          </p>
          <footer className="text-xs">— Nutzer Refstack</footer>
        </blockquote>
      </div>

      {/* Rechte Seite: Formular */}
      <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
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

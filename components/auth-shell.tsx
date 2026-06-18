import Link from 'next/link'

import { AuthBrandPanel, type AuthBrandContent } from '@/components/auth-brand-panel'

type AuthShellProps = {
  children: React.ReactNode
  brandContent: AuthBrandContent
  /** Link oben rechts (z. B. "Anmelden" auf Registrieren) */
  topRightLink?: { href: string; label: string }
}

export function AuthShell({ children, brandContent, topRightLink }: AuthShellProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-zinc-100/50">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="relative flex flex-col items-center justify-center bg-white/75 px-8 py-10 backdrop-blur-xl lg:px-16">
          {topRightLink ? (
            <div className="absolute right-4 top-4 md:right-8 md:top-8">
              <Link
                href={topRightLink.href}
                className="text-sm font-medium text-gray-500 underline-offset-4 transition-colors hover:text-gray-900 hover:underline"
              >
                {topRightLink.label}
              </Link>
            </div>
          ) : null}
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <AuthBrandPanel content={brandContent} />
      </div>
    </div>
  )
}

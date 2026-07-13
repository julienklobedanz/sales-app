'use client'

import { AuthThemeToggle } from '@/components/auth-theme-toggle'

export type AuthBrandContent = {
  title: string
  description?: string
  bullets?: string[]
}

export function AuthBrandPanel({ content }: { content: AuthBrandContent }) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-12 lg:flex">
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-16 left-1/3 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-zinc-950 shadow-sm">
            R
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">RefStack</span>
        </div>
        <AuthThemeToggle variant="brand" />
      </div>

      <div className="relative z-10">
        <h2 className="max-w-md text-3xl font-medium tracking-tight text-white">{content.title}</h2>
        {content.bullets && content.bullets.length > 0 ? (
          <div className="mt-4 max-w-sm text-sm text-zinc-400">
            <p className="mb-2">Alles an einem Ort:</p>
            <ul className="list-inside list-disc space-y-1">
              {content.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : content.description ? (
          <p className="mt-4 max-w-sm text-sm text-zinc-400">{content.description}</p>
        ) : null}
      </div>

      <div className="relative z-10 h-8" aria-hidden />
    </div>
  )
}

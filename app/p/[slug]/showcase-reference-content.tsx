import { ReferenceContentCore } from '@/components/references/reference-content-core'

export function ShowcaseReferenceContent({
  summary,
  challenge,
  solution,
}: {
  summary: string | null | undefined
  challenge: string | null | undefined
  solution: string | null | undefined
}) {
  return (
    <ReferenceContentCore
      surface="reduced"
      summary={summary}
      challenge={challenge}
      solution={solution}
      renderSection={({ title, children }) => (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-foreground">{title}</h3>
          {children}
        </section>
      )}
    />
  )
}

import {
  formatShowcaseNarrativeForDisplay,
  parseShowcaseBulletItems,
} from '@/lib/references/narrative-normalize'

const NARRATIVE_BODY_CLASS = 'w-full max-w-none text-sm leading-relaxed text-muted-foreground'

function ShowcaseSection({ title, text }: { title: string; text: string }) {
  const formatted = formatShowcaseNarrativeForDisplay(text)
  const bullets = parseShowcaseBulletItems(formatted)

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-3 text-base font-semibold text-foreground">{title}</h3>
      {bullets ? (
        <ul className={`${NARRATIVE_BODY_CLASS} list-disc space-y-2 pl-5`}>
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className={`${NARRATIVE_BODY_CLASS} whitespace-pre-wrap`}>{formatted}</p>
      )}
    </section>
  )
}

export function ShowcaseReferenceContent({
  summary,
  challenge,
  solution,
}: {
  summary: string | null | undefined
  challenge: string | null | undefined
  solution: string | null | undefined
}) {
  const summaryText = summary?.trim()
  const challengeText = challenge?.trim()
  const solutionText = solution?.trim()

  if (!summaryText && !challengeText && !solutionText) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Für diese Freigabe sind keine weiteren Inhalte hinterlegt.
      </p>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      {summaryText ? <ShowcaseSection title="Kurzbeschreibung" text={summaryText} /> : null}
      {challengeText ? <ShowcaseSection title="Herausforderung" text={challengeText} /> : null}
      {solutionText ? <ShowcaseSection title="Unsere Lösung" text={solutionText} /> : null}
    </div>
  )
}

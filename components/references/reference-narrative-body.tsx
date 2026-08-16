import {
  formatShowcaseNarrativeForDisplay,
  parseShowcaseBulletItems,
} from '@/lib/references/narrative-normalize'

const NARRATIVE_BODY_CLASS =
  'w-full max-w-none text-sm leading-relaxed text-muted-foreground'

export function ReferenceNarrativeBody({ text }: { text: string }) {
  const formatted = formatShowcaseNarrativeForDisplay(text)
  const bullets = parseShowcaseBulletItems(formatted)

  if (bullets) {
    return (
      <ul className={`${NARRATIVE_BODY_CLASS} list-disc space-y-2 pl-5`}>
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }

  return <p className={`${NARRATIVE_BODY_CLASS} whitespace-pre-wrap`}>{formatted}</p>
}

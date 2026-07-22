import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

type Props = {
  title: string
  previewLabel: string
  previewText?: string | null
  emptyPreviewText: string
}

export function TableTitleHoverContent({
  title,
  previewLabel,
  previewText,
  emptyPreviewText,
}: Props) {
  const trimmedPreview = String(previewText ?? '').trim()

  return (
    <HoverCard openDelay={200} closeDelay={80}>
      <HoverCardTrigger asChild>
        <span
          className="block min-w-0 cursor-default truncate text-sm font-semibold leading-snug text-foreground decoration-foreground/30 underline-offset-2 hover:underline"
          title={title}
        >
          {title}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="w-[min(100vw-2rem,380px)] max-h-[260px] overflow-y-auto"
      >
        <p className="mb-2 text-xs font-medium text-muted-foreground">{previewLabel}</p>
        {trimmedPreview ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {trimmedPreview}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">{emptyPreviewText}</p>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}

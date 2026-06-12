export function ReferenceReadinessValue({ value }: { value: string | null | undefined }) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    return <span className="min-w-0 flex-1 basis-0 text-right font-medium text-muted-foreground">—</span>
  }
  return (
    <span className="min-w-0 flex-1 basis-0 break-words text-right font-medium leading-snug [overflow-wrap:anywhere]">
      {text}
    </span>
  )
}

export function ReferenceReadinessValue({ value }: { value: string | null | undefined }) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    return <span className="font-medium text-muted-foreground">—</span>
  }
  return <span className="font-medium text-right">{text}</span>
}

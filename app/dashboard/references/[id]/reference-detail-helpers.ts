export function splitTags(tags: string | null) {
  return (tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

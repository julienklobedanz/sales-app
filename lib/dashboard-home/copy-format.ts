/** Ersetzt `{key}`-Platzhalter in COPY-Strings. */
export function formatCopy(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''))
}

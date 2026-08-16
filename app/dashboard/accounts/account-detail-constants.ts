export function referenceStatusLabel(s: string) {
  if (s === 'approved') return 'Freigegeben'
  if (s === 'internal_only') return 'Intern'
  if (s === 'draft') return 'Entwurf'
  if (s === 'anonymized') return 'Anonymisiert'
  return s
}

import type { NdaDisplayStatus } from '@/lib/accounts/account-entity'

export function NdaStatusBadge({
  status,
  compact = false,
  subtle = false,
}: {
  status: NdaDisplayStatus
  compact?: boolean
  /** Dezente Darstellung für Grid-Karten */
  subtle?: boolean
}) {
  const sizeClass = subtle
    ? 'p-0 text-[10px] font-normal leading-snug'
    : compact
      ? 'px-1.5 py-0.5 text-[10px] font-medium'
      : 'px-2 py-0.5 text-xs font-medium'

  if (status === 'active') {
    return (
      <span
        className={
          subtle
            ? `block text-left text-emerald-700/80 dark:text-emerald-400/80 ${sizeClass}`
            : `inline-flex shrink-0 items-center rounded-full border border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 ${sizeClass}`
        }
      >
        {compact || subtle ? 'NDA ✓' : 'NDA aktiv'}
      </span>
    )
  }
  if (status === 'expiring') {
    return (
      <span
        className={
          subtle
            ? `block text-left text-amber-700/80 dark:text-amber-400/80 ${sizeClass}`
            : `inline-flex shrink-0 items-center rounded-full border border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 ${sizeClass}`
        }
      >
        {compact || subtle ? 'NDA läuft ab' : 'NDA läuft ab'}
      </span>
    )
  }
  return (
    <span
      className={
        subtle
          ? `block text-left text-muted-foreground/60 ${sizeClass}`
          : `inline-flex shrink-0 items-center rounded-full border border-border/80 bg-muted/40 text-muted-foreground ${sizeClass}`
      }
    >
      {compact || subtle ? 'Kein NDA' : 'Kein NDA'}
    </span>
  )
}

export function ndaAgreementStatusLabel(status: string): string {
  if (status === 'active') return 'Aktiv'
  if (status === 'expired') return 'Abgelaufen'
  if (status === 'pending') return 'Ausstehend'
  return status
}

export function formatNdaValidUntil(validUntil: string | null): string {
  if (!validUntil) return 'Unbefristet'
  try {
    return new Date(`${validUntil}T12:00:00`).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return validUntil
  }
}

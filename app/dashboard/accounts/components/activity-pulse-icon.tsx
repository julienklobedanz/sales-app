import { cn } from '@/lib/utils'

/** EKG-/Puls-Linie für „Letzte Aktivität“ */
export function ActivityPulseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-3.5 shrink-0', className)}
      aria-hidden
    >
      <path
        d="M2 12h2.5l1.5-3 2.5 6 2-8 2.5 10 1.5-3H22"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

import { cn } from '@/lib/utils'

/** Dokument mit zentriertem „NDA“ — Line-Icon im App-Stil */
export function NdaDocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-4 shrink-0', className)}
      aria-hidden
    >
      <rect
        x="6.5"
        y="3.5"
        width="11"
        height="17"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <text
        x="12"
        y="12.5"
        fill="currentColor"
        fontSize="3.85"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing="-0.35"
      >
        NDA
      </text>
    </svg>
  )
}

'use client'

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'

export function ShowcaseSecurityLink({ workspaceName }: { workspaceName: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground underline-offset-4 hover:underline"
        >
          Sicherheit & Datenschutz
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" side="top">
        <PopoverHeader>
          <PopoverTitle>Sicherheit & Datenschutz</PopoverTitle>
          <PopoverDescription className="text-xs leading-relaxed">
            Diese Seite zeigt ausschließlich für die Freigabe bestimmte Informationen. Es werden keine
            Tracking-Cookies für Werbezwecke gesetzt. Ansprechpartner und Inhalte stammen von{' '}
            <span className="font-medium text-foreground">{workspaceName}</span>. Für vertragliche oder
            datenschutzrechtliche Informationen wenden Sie sich bitte direkt an den genannten Anbieter oder
            nutzen Sie dessen Website bzw. Impressum.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}

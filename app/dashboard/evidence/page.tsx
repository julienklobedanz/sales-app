import { redirect } from 'next/navigation'

export default function EvidenceIndexRedirect() {
  // Evidence Hub (E2) wird als eigene Route umgesetzt.
  // Bis dahin leiten wir auf die existierende Referenz-Übersicht weiter.
  redirect('/dashboard')
}


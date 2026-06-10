import type { AppRole } from '@/hooks/useRole'

export type CommandCenterSuggestion = {
  label: string
  query: string
}

const SALES_SUGGESTIONS: CommandCenterSuggestion[] = [
  {
    label: '☁️ Cloud-Migration mit Governance',
    query: 'Cloud Landing Zone, Migration und Governance für Enterprise',
  },
  {
    label: '🔒 Zero Trust & Compliance',
    query: 'Zero Trust, SIEM und Audit-Anforderungen im Finanzsektor',
  },
  {
    label: '📊 Datenplattform & BI',
    query: 'Daten-Silos abbauen, Lakehouse und Self-Service BI',
  },
]

const ADMIN_SUGGESTIONS: CommandCenterSuggestion[] = [
  { label: '👥 Nutzer verwalten', query: 'Nutzer' },
  { label: '🛡️ System-Zertifikate', query: 'Zertifikate' },
  { label: '⚙️ API-Status prüfen', query: 'API' },
]

const ACCOUNT_MANAGER_SUGGESTIONS: CommandCenterSuggestion[] = [
  { label: '⏳ Offene SME-Fragen', query: 'SME Routing' },
  { label: '🚨 Kritische Red Flags', query: 'Red Flags' },
  { label: '📅 Deadlines diese Woche', query: 'Fristen' },
]

export function commandCenterSuggestionsForRole(role: AppRole): CommandCenterSuggestion[] {
  if (role === 'admin') return ADMIN_SUGGESTIONS
  if (role === 'account_manager') return ACCOUNT_MANAGER_SUGGESTIONS
  return SALES_SUGGESTIONS
}

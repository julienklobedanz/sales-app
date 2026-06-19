import type { AppRole } from '@/hooks/useRole'
import { commandCenterSuggestionsBranch } from '@/lib/roles/legacy-mapping'

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
  {
    label: '💶 Projekte über 2 Mio. Euro',
    query: 'Projekte über 2 Millionen Euro mit Enterprise-Volumen',
  },
  {
    label: '🏦 Referenzen Finanzbranche',
    query: 'Compliance und Security für Banken und Versicherungen',
  },
  {
    label: '🛡️ Security-Hardening',
    query: 'Security-Hardening, SIEM und Zero-Trust-Blueprint',
  },
  {
    label: '🔗 CRM & MDM',
    query: 'CRM und MDM Harmonisierung mit Datenqualität',
  },
  {
    label: '📜 ISO 27001 Zertifikat',
    query: 'ISO 27001 Zertifikat',
  },
  {
    label: '📰 News zu Favoriten-Accounts',
    query: 'News',
  },
]

const ADMIN_SUGGESTIONS: CommandCenterSuggestion[] = [
  { label: '☁️ Cloud & Governance', query: 'Cloud Migration mit Landing Zone und Governance' },
  { label: '🔒 Compliance-Referenzen', query: 'Audit, Compliance und Zero Trust im Enterprise' },
  { label: '💶 Große Projekte', query: 'Referenzen mit Projektvolumen über 3 Millionen Euro' },
]

const ACCOUNT_MANAGER_SUGGESTIONS: CommandCenterSuggestion[] = [
  { label: '☁️ Cloud-Migration', query: 'Skalierbare Cloud-Plattform und Migration' },
  { label: '🔒 Security & Audit', query: 'Security-Hardening unter Compliance-Anforderungen' },
  { label: '📊 Data Platform', query: 'Lakehouse, Analytics und Self-Service BI' },
]

export function commandCenterSuggestionsForRole(role: AppRole): CommandCenterSuggestion[] {
  const branch = commandCenterSuggestionsBranch(role)
  if (branch === 'admin') return ADMIN_SUGGESTIONS
  if (branch === 'account_manager') return ACCOUNT_MANAGER_SUGGESTIONS
  return SALES_SUGGESTIONS
}

/** Während der Eingabe: passende Beispielanfragen (keine Live-Suche). */
export function filterCommandCenterSuggestions(
  suggestions: CommandCenterSuggestion[],
  draft: string,
  limit = 5
): CommandCenterSuggestion[] {
  const q = draft.trim().toLowerCase()
  if (!q) return suggestions.slice(0, limit)

  const scored = suggestions
    .map((s) => {
      const hay = `${s.label} ${s.query}`.toLowerCase()
      if (hay.includes(q)) return { s, score: 3 }
      const tokens = q.split(/\s+/).filter((t) => t.length >= 3)
      const hits = tokens.filter((t) => hay.includes(t)).length
      return { s, score: hits }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length) return scored.slice(0, limit).map((x) => x.s)
  return suggestions.slice(0, Math.min(3, limit))
}

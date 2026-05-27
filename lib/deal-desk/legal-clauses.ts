/** Vorlagen für Vertrags- und Marketing-Klauseln (Deal Desk — Referenz Inkubator). */

export const STANDARD_REFERENCE_CLAUSE = `Der Auftragnehmer ist berechtigt, den Kunden namentlich als Referenz zu nennen und die durchgeführte Leistung in anonymisierter oder namentlicher Form in Präsentationen, Angebotsunterlagen und auf der Unternehmenswebsite darzustellen, sofern keine abweichende schriftliche Vereinbarung getroffen wurde. Eine darüber hinausgehende Nutzung von Logos, Marken oder Screenshots bedarf der vorherigen schriftlichen Zustimmung des Kunden.`

export const LOGO_USAGE_CLAUSE = `Der Kunde räumt dem Auftragnehmer nach erfolgreichem Projektabschluss das einfache, nicht ausschließliche Recht ein, Name und Logo des Kunden in Marketingmaterialien, Case Studies und auf Events zu verwenden. Die Nutzung erfolgt in der vereinbarten Form und Farbgebung; der Kunde kann die Freigabe schriftlich widerrufen, sofern keine feste Laufzeit vereinbart wurde.`

export const LEGAL_CLAUSE_ITEMS = [
  {
    id: 'reference',
    title: 'Standard-Referenzklausel',
    description: 'Für Vertrag / Angebot — namentliche Referenznutzung',
    text: STANDARD_REFERENCE_CLAUSE,
  },
  {
    id: 'logo',
    title: 'Logo-Nutzungsrecht',
    description: 'Für Marketing — Logo & Case Study nach Go-Live',
    text: LOGO_USAGE_CLAUSE,
  },
] as const

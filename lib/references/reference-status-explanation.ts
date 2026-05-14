/**
 * Kurzer Hilfetext für die Referenz-Freigabestufe (Detailansicht / Tooltips).
 */
export function getReferenceStatusExplanation(
  status: string | null | undefined,
  customerApprovalStatus?: string | null
): string {
  if (String(customerApprovalStatus ?? '').toLowerCase() === 'pending') {
    return 'Kundenfreigabe: Der Kunde bearbeitet die Freigabe oder sie steht noch aus. Die Referenz ist noch nicht für die externe Nutzung freigegeben.'
  }
  const s = String(status ?? '').toLowerCase()
  if (s === 'approved' || s === 'external') {
    return 'Extern freigegeben: Vom Kunden und intern freigegeben – geeignet für Pitches und Kundenunterlagen gemäß vereinbartem Nutzungsumfang.'
  }
  if (s === 'internal_only' || s === 'internal') {
    return 'Nur intern: Verifiziert, sensible Angaben (z. B. Namen, Preise) dürfen das Haus nicht verlassen.'
  }
  if (s === 'anonymized' || s === 'anonymous') {
    return 'Anonymisiert: Kundenname und Logo sind entfernt – typisch für öffentliche Case Studies ohne konkrete Benennung.'
  }
  if (s === 'pending') {
    return 'Freigabe ausstehend: Die Referenz durchläuft noch den Freigabe- oder Prüfprozess.'
  }
  return 'Entwurf: In Bearbeitung, nur für berechtigte Personen sichtbar.'
}

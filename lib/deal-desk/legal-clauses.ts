/** Vorlagen für Vertrags- und Marketing-Klauseln (Deal Desk — Referenz Inkubator). */

const CLAUSE_ROUNDUM_SORGLOS = `Der [Auftragnehmer/Dienstleister] ist berechtigt, den Kunden nach erfolgreichem Vertragsabschluss sowie während und nach der Vertragslaufzeit zeitlich unbegrenzt namentlich als Referenzkunden zu nennen. Dies umfasst das Recht zur Nutzung des Kundennamens und des Firmenlogos auf der Website des [Auftragnehmers/Dienstleisters], in Social-Media-Kanälen, Präsentationen und gedruckten Werbematerialien.

Der [Auftragnehmer/Dienstleister] ist zudem berechtigt, eine Pressemitteilung bezüglich der Zusammenarbeit und des Projekterfolgs zu veröffentlichen. Der Text wird vor Veröffentlichung mit dem Kunden abgestimmt; der Kunde wird seine Zustimmung nicht unbillig verweigern.

Der Kunde erklärt sich bereit, auf unbestimmte Zeit als Referenz für potenzielle Neukunden des [Auftragnehmers/Dienstleisters] zur Verfügung zu stehen (sog. Reference Calls). Der Kunde benennt hierfür einen qualifizierten Ansprechpartner (Name, Position, geschäftliche E-Mail/Telefonnummer). Der Kunde stellt sicher, dass die Weitergabe dieser personenbezogenen Daten an den [Auftragnehmer/Dienstleister] und deren Nutzung für gelegentliche Referenzanfragen datenschutzkonform erfolgt und die erforderlichen Einwilligungen des Mitarbeiters vorliegen. Der Kunde kann den Ansprechpartner jederzeit durch Mitteilung in Textform gegen einen anderen qualifizierten Mitarbeiter austauschen.`

const CLAUSE_MITTEL_SICHTBARKEIT = `Der [Auftragnehmer/Dienstleister] ist berechtigt, den Kunden namentlich und unter Verwendung seines Firmenlogos zeitlich unbegrenzt als Referenzkunden zu nennen und aufzuführen. Die Nutzung ist beschränkt auf die eigene Unternehmenswebsite, Marketingpräsentationen und Angebote an Dritte.

Der Kunde erklärt sich bereit, auf unbestimmte Zeit als Telefon- oder Video-Referenz für qualifizierte Mietinteressenten/Potenzialkunden des [Auftragnehmers/Dienstleisters] zu agieren. Zu diesem Zweck benennt der Kunde einen fachlich zuständigen Ansprechpartner. Der Kunde trägt dafür Sorge, dass die Benennung dieses Ansprechpartners im Einklang mit den datenschutzrechtlichen Bestimmungen (insb. der DSGVO) erfolgt und die Einwilligung des betroffenen Mitarbeiters vorliegt. Ein Austausch des Ansprechpartners ist dem Kunden jederzeit in Textform möglich.`

const CLAUSE_ANONYMISIERT = `Der [Auftragnehmer/Dienstleister] ist berechtigt, die für den Kunden erbrachte Leistung zu Marketing- und Vertriebszwecken (z. B. auf der Website, in Broschüren oder Case Studies) in anonymisierter Form zu verwenden.

Die Anonymisierung erfolgt in der Weise, dass kein direkter Rückschluss auf die Identität des Kunden möglich ist. Zulässig ist die Beschreibung des Kunden anhand allgemeiner Kriterien (z. B. „Führendes Unternehmen aus dem FMCG-Sektor mit ca. 500 Mitarbeitern“ oder „Internationaler Automobilzulieferer“).`

export const LEGAL_CLAUSE_ITEMS = [
  {
    id: 'roundum-sorglos',
    title: 'Das „Rundum-Sorglos-Paket“ (Presse, Name & Kontaktperson)',
    text: CLAUSE_ROUNDUM_SORGLOS,
  },
  {
    id: 'mittel',
    title: 'Mittlere Sichtbarkeit (Name & Kontaktperson, ohne Pressemitteilung)',
    text: CLAUSE_MITTEL_SICHTBARKEIT,
  },
  {
    id: 'anonym',
    title: 'Anonymisiert',
    text: CLAUSE_ANONYMISIERT,
  },
] as const

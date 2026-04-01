export const COPY = {
  nav: {
    accounts: 'Accounts',
    deals: 'Deals',
    evidence: 'Referenzen',
    marketSignals: 'Marktsignale',
    match: 'Suche',
    settings: 'Einstellungen',
  },
  pages: {
    dashboard: 'Dashboard',
    evidence: 'Referenzen',
    marketSignals: 'Marktsignale',
    match: 'Suche',
  },
  misc: {
    matches: 'Treffer',
    teamManagement: 'Teamverwaltung',
    workspace: 'Arbeitsbereich',
    firstReference: 'Erste Referenz',
    team: 'Team',
  },
  roles: {
    accountManager: 'Account Manager',
    salesManager: 'Sales Manager',
    readOnly: 'Nur Lesen',
  },
  settings: {
    accountDeletionNotAvailableHint:
      'Kontolöschung ist aktuell nicht als Self-Service verfügbar.',
    accountDeletionDisabledToast:
      'Kontolöschung ist derzeit nicht aktiviert. Bitte wende dich an den Support, wenn du den Workspace schließen möchtest.',
  },
  table: {
    empty: 'Keine Ergebnisse.',
    rowsPerPage: 'Zeilen pro Seite',
    columns: 'Spalten',
    view: 'Ansicht',
  },
  evidence: {
    contextSelect: 'Selektieren',
    contextOpen: 'Öffnen',
    contextEdit: 'Bearbeiten',
    filterReferencesPlaceholder: 'Referenzen filtern…',
  },
  deals: {
    contextSelect: 'Selektieren',
    contextOpen: 'Deal öffnen',
    contextOpenNewTab: 'In neuem Tab öffnen',
    searchPlaceholder: 'Deals durchsuchen (Titel, Account, AM) …',
  },
  accounts: {
    searchCompaniesPlaceholder: 'Firma suchen …',
    addAccount: 'Account hinzufügen',
    ariaFavoritesOnlyOn: 'Nur Favoriten anzeigen',
    ariaFavoritesOnlyOff: 'Alle Accounts anzeigen',
  },
  dashboard: {
    searchReferencesPlaceholder: 'Referenzen suchen...',
    columnVisibility: 'Sichtbarkeit',
    columnsToggleAria: 'Spalten ein-/ausblenden',
  },
  commandPalette: {
    title: 'Command Palette',
    description: 'Suche nach Referenzen, Accounts oder Deals',
    placeholder: 'Suche nach Referenzen, Deals, Accounts…',
    searchLoading: 'Suche läuft…',
    searchEmpty: 'Keine Ergebnisse gefunden.',
    quickActions: 'Schnellaktionen',
    recents: 'Zuletzt besucht',
    noRecentsYet: 'Noch keine Einträge',
    actionStartMatch: 'Suche starten',
    actionNewDeal: 'Neuen Deal erstellen',
    actionRfpUpload: 'RFP im Deal hochladen',
    actionNewReference: 'Neue Referenz erstellen',
    actionNewAccount: 'Account erstellen',
  },
} as const

/** Tabellen: Auswahl-Zeile („3 von 10 Zeilen ausgewählt“). */
export function copyTableRowsSelected(selected: number, total: number) {
  return `${selected} von ${total} Zeilen ausgewählt`
}


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
  notifications: {
    title: 'Benachrichtigungen',
    markAllReadAria: 'Alle Benachrichtigungen als gelesen markieren',
    unreadBadgeAria: 'Ungelesen',
  },
  /** Profilmenü: Rollen-Vorschau (Test-Modus, vor Launch deaktivieren) */
  devRolePreview: {
    badgeAdminAria: 'Vorschau: Admin / Referenz-Manager',
    badgeSalesAria: 'Vorschau: Sales',
    roleSwitchSectionTitle: 'Rolle wechseln (Test-Modus)',
    roleMarketingAdmin: 'Marketing / Admin',
    roleAccountManager: 'Account Manager',
    roleSalesRep: 'Sales Representative',
    switchSuccess: 'Vorschau-Rolle aktualisiert.',
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
    teamInviteEmailSent: 'Einladung wurde per E-Mail versendet.',
    teamInviteSavedEmailMissingKey:
      'Einladung ist gespeichert, aber E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY in der Server-Umgebung).',
    teamInviteSavedEmailFailed:
      'Einladung ist gespeichert, die E-Mail konnte nicht versendet werden.',
    teamInviteCopyLink: 'Einladungslink kopieren',
    teamInviteLinkCopied: 'Einladungslink in die Zwischenablage kopiert.',
    devRoleTab: 'Entwicklung',
    devRoleCardTitle: 'Rollen-Vorschau (nur Entwicklung)',
    devRoleCardDescription:
      'Wechselt nur die sichtbare Rolle in der App (Cookie). Server-Aktionen nutzen weiterhin deine echte Profil-Rolle in der Datenbank, sofern dort nicht explizit die Vorschau berücksichtigt wird.',
    devRoleStoredLabel: 'Rolle in der Datenbank',
    devRoleEffectiveLabel: 'Aktive Vorschau',
    devRoleClear: 'Vorschau aufheben',
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
    createDialogNameHint: 'Tippen für Vorschläge aus deiner Organisation und Brandfetch.',
    createDialogSuggestLocal: 'Bereits angelegt',
    createDialogSuggestBrandfetch: 'Vorschlag',
    createDialogSearching: 'Suche …',
    createDialogOpenExisting: 'Dieser Account existiert bereits. Es wird zur Detailseite gewechselt.',
    editDialogTitle: 'Account bearbeiten',
    editSuccess: 'Account gespeichert.',
    editButton: 'Bearbeiten',
    quickCreateAccountTitle: 'Neuen Account anlegen',
    quickCreateAccountSubmit: 'Account anlegen und auswählen',
    quickCreateAccountHint:
      'Legt einen Account in deiner Organisation an und wählt ihn für diesen Deal aus.',
  },
  dashboard: {
    searchReferencesPlaceholder: 'Referenzen suchen...',
    columnVisibility: 'Sichtbarkeit',
    columnsToggleAria: 'Spalten ein-/ausblenden',
  },
  marketSignals: {
    pageSubtitle: 'Deine Account-Intelligenz auf einen Blick',
    executiveSection: 'Executive Tracking',
    newsSection: 'Account News',
    filterAccount: 'Account filtern',
    filterSegmentLabel: 'Typ',
    allAccounts: 'Alle Accounts',
    segmentAll: 'Alle',
    segmentCustomers: 'Kunden',
    segmentProspects: 'Prospects',
    newBadge: 'Neu',
    openAccount: 'Account öffnen',
    sourcePrefix: 'Quelle',
    executiveEmptyTitle: 'Noch keine Führungswechsel',
    executiveEmptyBody:
      'In Phase 1 werden Einträge manuell gepflegt oder per CSV importiert. Anschließend erscheinen sie hier.',
    newsEmptyTitle: 'Noch keine Account-News',
    newsEmptyBody:
      'In Phase 1 werden Meldungen als Notizen je Account erfasst. Automatische Quellen folgen später.',
    roleChangeArrow: '→',
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
    /** Anzeige in der Suche, wenn keine Firma verknüpft ist */
    referenceNoAccountLabel: 'Kein Accountname vergeben',
  },
} as const

/** Tabellen: Auswahl-Zeile („3 von 10 Zeilen ausgewählt“). */
export function copyTableRowsSelected(selected: number, total: number) {
  return `${selected} von ${total} Zeilen ausgewählt`
}


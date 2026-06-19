export const COPY = {
  nav: {
    accounts: 'Accounts',
    partners: 'Partner',
    deals: 'Deals',
    evidence: 'Referenzen',
    marketSignals: 'Marktsignale',
    dealDesk: 'Deal Desk',
    match: 'Finden',
    insights: 'Insights',
    settings: 'Einstellungen',
  },
  pages: {
    dashboard: 'Home',
    evidence: 'Referenzen',
    marketSignals: 'Marktsignale',
    dealDesk: 'Deal Desk',
    match: 'Finden',
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
  /** Profilmenü: welche Rolle die Oberfläche steuert (Cookie, nur wenn die Umgebung es erlaubt). */
  roleSwitcher: {
    profileMenuSectionTitle: 'Rolle wechseln',
    roleMarketingAdmin: 'Marketing / Admin',
    roleAccountManager: 'Account Manager',
    roleSalesRep: 'Sales Representative',
    switchSuccess: 'Oberflächen-Rolle aktualisiert.',
  },
  roles: {
    accountManager: 'Account Manager',
    salesManager: 'Sales Manager',
    readOnly: 'Nur Lesen',
  },
  roleDimensions: {
    systemRoles: {
      owner: 'Inhaber',
      admin: 'Administrator',
      member: 'Mitglied',
      viewer: 'Betrachter',
    },
    functionRoles: {
      sales_rep: 'Vertrieb',
      account_manager: 'Account Manager',
      sales_leader: 'Sales Lead',
    },
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
    roleSwitcherTab: 'Entwicklung',
    roleSwitcherCardTitle: 'Rollenauswahl (Entwicklung)',
    roleSwitcherCardDescription:
      'Legt fest, welche Rolle die Oberfläche steuert (Cookie). Viele Aktionen auf dem Server prüfen weiterhin deine gespeicherte Profil-Rolle in der Datenbank.',
    roleSwitcherStoredLabel: 'Rolle in der Datenbank',
    roleSwitcherActiveLabel: 'Rolle in der Oberfläche',
    roleSwitcherPickLabel: 'Als folgende Rolle anzeigen',
    roleSwitcherReset: 'Anzeige zurücksetzen',
    rolesPermissions: {
      title: 'Rollen & Rechte',
      description:
        'Org-weite Vorgaben für Sichtbarkeit und Freigabe. Ohne Konfiguration gelten die Standardwerte aus dem Rollenmodell.',
      salesSeesDraftsLabel: 'Vertrieb sieht Entwürfe',
      salesSeesDraftsHint:
        'Wenn aktiv, dürfen Vertriebsmitglieder (sales_rep) Entwürfe in der Datenbank sehen — wirkt in RLS und Suche.',
      visibilityMatrixTitle: 'Sichtbarkeit nach Funktions-Rolle',
      approvalRoutingLabel: 'Freigabe-Routing',
      approvalRoutingHint:
        'Gespeicherte Vorgabe für künftige Workflow-Anbindung. Bestehende Freigabe-Flows bleiben unverändert, bis sie daran angebunden werden.',
      approvalRouting: {
        am_direct: 'Account Manager → Kunde',
        via_rpm: 'Über Reference Program Manager',
        legal_gate_on_nda: 'Legal-Gate bei NDA',
      },
      sensitivityDraft: 'Label Entwurf',
      sensitivityNda: 'Label NDA',
      sensitivityConfidential: 'Label vertraulich (Sales)',
      save: 'Speichern',
      saveSuccess: 'Rollen & Rechte gespeichert.',
      capabilities: {
        see_draft_references: 'Entwürfe sehen',
        see_confidential_references: 'Vertrauliche Referenzen sehen',
      },
    },
  },
  table: {
    empty: 'Keine Ergebnisse.',
    rowsPerPage: 'Ergebnisse pro Seite',
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
    newDealButton: 'Deal anlegen',
    filterStatusAll: 'Alle Status',
    filterStatusNegotiation: 'Verhandlung',
    filterStatusRfp: 'RFP-Phase',
    filterStatusWon: 'Gewonnen',
    filterStatusLost: 'Verloren',
    referenceCountColumn: 'Referenzen',
  },
  accounts: {
    searchCompaniesPlaceholder: 'Firma suchen …',
    searchPartnersPlaceholder: 'Partner suchen …',
    addAccount: 'Account hinzufügen',
    addPartner: 'Partner hinzufügen',
    bulkUploadTooltip:
      'Accounts aus Excel- oder CSV-Datei importieren (Spalten z. B. Name, Website, Branche).',
    bulkUploadTooltipPartner:
      'Partner aus Excel- oder CSV-Datei importieren (Spalten z. B. Name, Website, Kategorie).',
    importTemplateDownload: 'Excel-Vorlage herunterladen',
    importCancel: 'Abbrechen',
    importRemoveFile: 'Datei entfernen',
    importInvalidFile: 'Bitte eine CSV- oder Excel-Datei (.csv, .xlsx, .xls) wählen.',
    importInProgress: 'Import läuft …',
    importAccount: {
      title: 'Accounts importieren',
      description:
        'Pro Zeile reicht der Firmenname in Spalte A — Website, Branche, Standort, Logo und Mitarbeiterzahl werden beim Import per Brandfetch ergänzt. Weitere Spalten sind optional.',
      dropzoneTitle: 'CSV oder Excel hierher ziehen',
      dropzoneHint: 'oder klicken, um eine Datei vom Gerät zu wählen',
      fileSelectedHint: 'Klicken oder ziehen zum Ersetzen',
      submit: 'Importieren',
    },
    importPartner: {
      title: 'Partner importieren',
      description:
        'Pro Zeile reicht der Name in Spalte A (optional Kategorie in F: sub, tech, legal, other). Alle anderen Felder werden per Brandfetch ergänzt.',
      dropzoneTitle: 'CSV oder Excel hierher ziehen',
      dropzoneHint: 'oder klicken, um eine Datei vom Gerät zu wählen',
      fileSelectedHint: 'Klicken oder ziehen zum Ersetzen',
      submit: 'Importieren',
    },
    tooltipFilter: 'Filtern',
    tooltipFavorites: 'Favoriten',
    alsoLinkedAccountHint: 'Auch als Account verknüpft',
    ariaFavoritesOnlyOn: 'Nur Favoriten anzeigen',
    ariaFavoritesOnlyOff: 'Alle Accounts anzeigen',
    createDialogNameHint:
      'Firmennamen eingeben — Vorschläge aus euren Accounts, Partnern und Markendaten erscheinen beim Tippen.',
    createDialogSuggestLocal: 'Bereits angelegt',
    createDialogSuggestBrandfetch: 'Markenvorschlag',
    createDialogSearching: 'Suche nach Firmennamen …',
    createDialogTypeMore: 'Mindestens 2 Zeichen für die Namenssuche eingeben.',
    createDialogNoResults:
      'Keine Treffer für diesen Namen. Namen weiter ausformulieren oder unten manuell anlegen.',
    createDialogBrandfetchHint:
      'Markendaten vorübergehend nicht verfügbar. Bitte kurz warten oder Stammdaten manuell ausfüllen.',
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
    columnsToggleAria: 'Spalten ein-/ausblenden',
    tooltipFavorites: 'Favoriten',
    tooltipStatus: 'Status',
    tooltipColumns: 'Spalten',
    tooltipImport: 'Importieren',
    tooltipCreateReference: 'Referenz erstellen',
  },
  marketSignals: {
    pageSubtitle: 'Deine Account-Intelligenz auf einen Blick',
    signalTypeExec: 'Exec Update',
    signalTypeCompany: 'Company Update',
    executiveSection: 'Executive Tracking',
    newsSection: 'Company Update',
    championSection: 'Executive Tracking',
    manage: 'Verwalten',
    filterAccount: 'Account filtern',
    filterSegmentLabel: 'Typ',
    allAccounts: 'Alle Accounts',
    segmentAll: 'Alle',
    segmentCustomers: 'Kunden',
    segmentProspects: 'Prospects',
    newBadge: 'Neu',
    openAccount: 'Zum Account',
    sourcePrefix: 'Quelle',
    loadMore: '10 weitere anzeigen',
    emptyFollowingTitle: 'Noch keine Accounts in deiner Watchlist',
    emptyFollowingBody: 'Start tracking your accounts to see signals here.',
    emptyFollowingCta: 'Accounts verwalten',
    executiveEmptyTitle: 'Noch keine Führungswechsel',
    executiveEmptyBody:
      'In Phase 1 werden Einträge manuell gepflegt oder per CSV importiert. Anschließend erscheinen sie hier.',
    newsEmptyTitle: 'Noch keine Company Updates',
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
  return `${selected} von ${total} Ergebnissen ausgewählt`
}


/** Gemeinsame Layout-Konstanten für die App-Dashboard-Shell. */
export const SHELL_SIDEBAR_EXPANDED = '15rem'
export const SHELL_SIDEBAR_COLLAPSED = '3.5rem'

/** Eine Lavendel-Fläche bis zum Viewport-Rand; Padding erzeugt den Inset wie bei Shell. */
export const shellOuterClass =
  'flex h-svh w-full min-h-0 flex-col bg-[color:var(--shell-outer)] p-3'

/** Flex-Zeile: Gap zwischen Sidebar- und Content-Insel (Lavendel scheint durch). */
export const shellFrameClass =
  'flex h-full min-h-0 w-full flex-1 items-stretch gap-3'

/** Weiße Insel mit abgerundeten Ecken — ohne grauen Außenrand. */
export const shellPanelClass =
  'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-[color:var(--shell-inner)] shadow-sm'

export const shellSidebarPanelClass = `${shellPanelClass} hidden h-full w-[var(--shell-sidebar-width,15rem)] shrink-0 transition-[width] duration-200 ease-linear md:flex`

export const shellMainPanelClass = `${shellPanelClass} h-full min-h-0 min-w-0 flex-1 basis-0 grow`

/** Inhalt im weißen Hauptpanel — kein pt-14 auf Desktop, kein grauer Hintergrund. */
export const SHELL_CONTENT_AREA_CLASS =
  'shell-page-content flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6 bg-white px-5 py-5 pt-14 md:px-8 md:py-7 md:pt-7'

/** Detail/Wizard-Seiten im weißen Panel ohne Shell-Padding. */
export const SHELL_CONTENT_BLEED_CLASS =
  'shell-page-content flex min-h-0 w-full flex-1 flex-col bg-white'

/** Primär-CTA — nutzt --shell-btn-* (auch in Dialog-Portalen). */
export const BRAND_PRIMARY_BUTTON_CLASS = 'brand-primary-button'

/** Aktiver Pill-/Segment-Button in Markenfarbe. */
export const BRAND_PRIMARY_PILL_ACTIVE_CLASS = 'brand-primary-pill-active'

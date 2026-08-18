export const ONBOARDING_STEP_COUNT = 2

export const ONBOARDING_STEP_META = [
  {
    title: 'Richte deinen Workspace ein',
    subtitle: 'Lass uns mit den Basics starten.',
  },
  {
    title: 'Lade dein Team ein',
    subtitle:
      'Bringe deine Kollegen aus dem Sales- und Customer-Marketing auf die Plattform.',
  },
] as const

export const ONBOARDING_BRAND_META = [
  {
    title: 'Die Schaltzentrale für deinen B2B-Vertrieb.',
    bullets: [
      'Referenzen deines gesamten Unternehmens',
      'Infos über eure Stakeholder',
      'News über eure Kunden und deren Executives',
    ],
  },
  {
    title: 'Gemeinsam Deals schneller closen.',
    description:
      'Mit RefStack erhaltet ihr News vor eurer Konkurrenz und sichert euch den Wettbewerbsvorteil.',
    bullets: [] as string[],
  },
] as const

export const ONBOARDING_MAX_TEAM_INVITES = 10
export const ONBOARDING_DEFAULT_TEAM_INVITES = 3

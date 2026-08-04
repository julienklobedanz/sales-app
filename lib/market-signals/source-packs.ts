import { resolveIndustryId } from '@/lib/constants/industries'

export type SourcePackDomain = {
  domain: string
  label: string
}

/** Übergreifendes Set für Stellenwechsel / C-Level / CIO (Move & Executive). */
export const PEOPLE_SOURCE_PACK: SourcePackDomain[] = [
  { domain: 'cio.de', label: 'CIO.de' },
  { domain: 'computerwoche.de', label: 'Computerwoche' },
  { domain: 'channelpartner.de', label: 'ChannelPartner' },
  { domain: 'handelsblatt.com', label: 'Handelsblatt' },
  { domain: 'manager-magazin.de', label: 'Manager Magazin' },
  { domain: 'capital.de', label: 'Capital' },
  { domain: 'personalwirtschaft.de', label: 'Personalwirtschaft' },
  { domain: 'humanresourcesmanager.de', label: 'Human Resources Manager' },
]

/**
 * Industrie-Standardsets (≥10 Domains) — Sites, auf denen AEs typischerweise
 * manuell nach Branchen-/Account-Signalen suchen würden.
 */
export const INDUSTRY_SOURCE_PACKS: Record<string, SourcePackDomain[]> = {
  fin: [
    { domain: 'versicherungsjournal.de', label: 'VersicherungsJournal' },
    { domain: 'versicherungswirtschaft-heute.de', label: 'VWheute' },
    { domain: 'versicherungsmagazin.de', label: 'Versicherungsmagazin' },
    { domain: 'cash-online.de', label: 'Cash.' },
    { domain: 'fondsprofessionell.de', label: 'Fondsprofessionell' },
    { domain: 'asscompact.de', label: 'AssCompact' },
    { domain: 'finanzbusiness.de', label: 'FinanzBusiness' },
    { domain: 'private-banking-magazin.de', label: 'Private Banking Magazin' },
    { domain: 'versicherungsbote.de', label: 'Versicherungsbote' },
    { domain: 'boerse-online.de', label: 'Börse Online' },
    { domain: 'finews.ch', label: 'finews' },
    { domain: 'handelsblatt.com', label: 'Handelsblatt' },
    { domain: 'wiwo.de', label: 'WirtschaftsWoche' },
  ],
  ret: [
    { domain: 'lebensmittelzeitung.net', label: 'Lebensmittel Zeitung' },
    { domain: 'handelsjournal.de', label: 'Handelsjournal' },
    { domain: 'stores-shops.de', label: 'Stores+Shops' },
    { domain: 'ecommercemagazin.de', label: 'eCommerce Magazin' },
    { domain: 'internetworld.de', label: 'Internet World' },
    { domain: 'absatzwirtschaft.de', label: 'absatzwirtschaft' },
    { domain: 'markenartikel-magazin.de', label: 'Markenartikel' },
    { domain: 'textilwirtschaft.de', label: 'TextilWirtschaft' },
    { domain: 'fashionunited.de', label: 'FashionUnited' },
    { domain: 'retailreport.at', label: 'Retail Report' },
    { domain: 'gs1-germany.de', label: 'GS1 Germany' },
    { domain: 'wiwo.de', label: 'WirtschaftsWoche' },
  ],
  man: [
    { domain: 'produktion.de', label: 'Produktion' },
    { domain: 'mm-maschinenmarkt.vogel.de', label: 'MaschinenMarkt' },
    { domain: 'industrie.de', label: 'industrie.de' },
    { domain: 'automobil-industrie.vogel.de', label: 'Automobil Industrie' },
    { domain: 'automotiveit.eu', label: 'AutomotiveIT' },
    { domain: 'electrive.net', label: 'electrive' },
    { domain: 'all-electronics.de', label: 'all-electronics' },
    { domain: 'fertigung.de', label: 'fertigung.de' },
    { domain: 'industrieanzeiger.de', label: 'Industrieanzeiger' },
    { domain: 'vdi-nachrichten.com', label: 'VDI Nachrichten' },
    { domain: 'kfz-betrieb.vogel.de', label: 'kfz-betrieb' },
    { domain: 'springerprofessional.de', label: 'Springer Professional' },
    { domain: 'handelsblatt.com', label: 'Handelsblatt' },
  ],
  tech: [
    { domain: 'cio.de', label: 'CIO.de' },
    { domain: 'computerwoche.de', label: 'Computerwoche' },
    { domain: 'heise.de', label: 'heise online' },
    { domain: 'golem.de', label: 'Golem' },
    { domain: 'silicon.de', label: 'silicon.de' },
    { domain: 'channelpartner.de', label: 'ChannelPartner' },
    { domain: 'it-daily.net', label: 'IT-Daily' },
    { domain: 'cloudcomputing-insider.de', label: 'CloudComputing-Insider' },
    { domain: 'security-insider.de', label: 'Security-Insider' },
    { domain: 'telecom-handel.de', label: 'Telecom Handel' },
    { domain: 'digitalbusiness-cloud.de', label: 'Digital Business Cloud' },
    { domain: 'crn.de', label: 'CRN' },
    { domain: 'zdnet.de', label: 'ZDNet' },
  ],
  media: [
    { domain: 'horizont.net', label: 'HORIZONT' },
    { domain: 'wuv.de', label: 'W&V' },
    { domain: 'absatzwirtschaft.de', label: 'absatzwirtschaft' },
    { domain: 'meedia.de', label: 'MEEDIA' },
    { domain: 'kress.de', label: 'kress' },
    { domain: 'dwdl.de', label: 'DWDL' },
    { domain: 'lead-digital.de', label: 'Lead Digital' },
    { domain: 'onlinemarketing.de', label: 'OnlineMarketing.de' },
    { domain: 'new-business.de', label: 'New Business' },
    { domain: 'mediabiz.de', label: 'mediabiz' },
    { domain: 'quotenmeter.de', label: 'Quotenmeter' },
    { domain: 'werbenundverkaufen.de', label: 'Werben & Verkaufen' },
  ],
  energy: [
    { domain: 'energate-messenger.de', label: 'energate' },
    { domain: 'pv-magazine.de', label: 'pv magazine' },
    { domain: 'erneuerbareenergien.de', label: 'Erneuerbare Energien' },
    { domain: 'euwid-energie.de', label: 'EUWID Energie' },
    { domain: 'solarserver.de', label: 'Solarserver' },
    { domain: 'windkraft-journal.de', label: 'Windkraft-Journal' },
    { domain: 'chemie.de', label: 'Chemie.de' },
    { domain: 'handelsblatt.com', label: 'Handelsblatt' },
    { domain: 'wiwo.de', label: 'WirtschaftsWoche' },
    { domain: 'energiezukunft.eu', label: 'Energiezukunft' },
    { domain: 'montelnews.com', label: 'Montel' },
    { domain: 'stromauskunft.de', label: 'StromAuskunft' },
  ],
  health: [
    { domain: 'aerzteblatt.de', label: 'Deutsches Ärzteblatt' },
    { domain: 'aerztezeitung.de', label: 'Ärzte Zeitung' },
    { domain: 'kma-online.de', label: 'kma Online' },
    { domain: 'pharmazeutische-zeitung.de', label: 'Pharmazeutische Zeitung' },
    { domain: 'apotheke-adhoc.de', label: 'Apotheke Adhoc' },
    { domain: 'deutsche-apotheker-zeitung.de', label: 'DAZ' },
    { domain: 'laborpraxis.vogel.de', label: 'Laborpraxis' },
    { domain: 'chemie.de', label: 'Chemie.de' },
    { domain: 'process.vogel.de', label: 'PROCESS' },
    { domain: 'pharma-food.de', label: 'Pharma Food' },
    { domain: 'e-health-com.de', label: 'e-health-com' },
    { domain: 'springermedizin.de', label: 'Springer Medizin' },
  ],
  pub: [
    { domain: 'behoerdenspiegel.de', label: 'Behördenspiegel' },
    { domain: 'kommune21.de', label: 'Kommune21' },
    { domain: 'egovernment-computing.de', label: 'eGovernment Computing' },
    { domain: 'innovative-verwaltung.de', label: 'Innovative Verwaltung' },
    { domain: 'politik-digital.de', label: 'politik-digital' },
    { domain: 'forschung-und-lehre.de', label: 'Forschung & Lehre' },
    { domain: 'duz.de', label: 'DUZ' },
    { domain: 'bildungsklick.de', label: 'bildungsklick' },
    { domain: 'heise.de', label: 'heise online' },
    { domain: 'cio.de', label: 'CIO.de' },
    { domain: 'staedtetag.de', label: 'Deutscher Städtetag' },
    { domain: 'vergabe24.de', label: 'Vergabe24' },
  ],
  log: [
    { domain: 'logistik-heute.de', label: 'Logistik Heute' },
    { domain: 'verkehrsrundschau.de', label: 'VerkehrsRundschau' },
    { domain: 'dvz.de', label: 'DVZ' },
    { domain: 'eurotransport.de', label: 'eurotransport' },
    { domain: 'transport-online.de', label: 'transport-online' },
    { domain: 'logistra.de', label: 'LOGISTRA' },
    { domain: 'airliners.de', label: 'airliners.de' },
    { domain: 'aero.de', label: 'aero.de' },
    { domain: 'schiffundhafen.de', label: 'Schiff & Hafen' },
    { domain: 'thb.info', label: 'THB' },
    { domain: 'railbusiness.de', label: 'Rail Business' },
    { domain: 'handelsblatt.com', label: 'Handelsblatt' },
  ],
  cons: [
    { domain: 'consulting.de', label: 'Consulting.de' },
    { domain: 'horizont.net', label: 'HORIZONT' },
    { domain: 'wuv.de', label: 'W&V' },
    { domain: 'handelsblatt.com', label: 'Handelsblatt' },
    { domain: 'wiwo.de', label: 'WirtschaftsWoche' },
    { domain: 'manager-magazin.de', label: 'Manager Magazin' },
    { domain: 'capital.de', label: 'Capital' },
    { domain: 'juve.de', label: 'JUVE' },
    { domain: 'lto.de', label: 'LTO' },
    { domain: 'brandeins.de', label: 'brand eins' },
    { domain: 'absatzwirtschaft.de', label: 'absatzwirtschaft' },
    { domain: 'cio.de', label: 'CIO.de' },
    { domain: 'channelpartner.de', label: 'ChannelPartner' },
  ],
  prop: [
    { domain: 'immobilienzeitung.de', label: 'Immobilien Zeitung' },
    { domain: 'immobilienmanager.de', label: 'Immobilienmanager' },
    { domain: 'haufe.de', label: 'Haufe Immobilien' },
    { domain: 'baunetz.de', label: 'BauNetz' },
    { domain: 'baugewerbe-magazin.de', label: 'Baugewerbe' },
    { domain: 're-port.de', label: 're-port' },
    { domain: 'property-magazine.de', label: 'Property Magazine' },
    { domain: 'institutional-money.com', label: 'Institutional Money' },
    { domain: 'handelsblatt.com', label: 'Handelsblatt' },
    { domain: 'wiwo.de', label: 'WirtschaftsWoche' },
    { domain: 'springerprofessional.de', label: 'Springer Professional' },
    { domain: 'bauingenieur24.de', label: 'Bauingenieur24' },
  ],
  /** Generisches Business-Pack wenn keine Branche gesetzt. */
  other: [
    { domain: 'handelsblatt.com', label: 'Handelsblatt' },
    { domain: 'wiwo.de', label: 'WirtschaftsWoche' },
    { domain: 'manager-magazin.de', label: 'Manager Magazin' },
    { domain: 'capital.de', label: 'Capital' },
    { domain: 'faz.net', label: 'FAZ' },
    { domain: 'reuters.com', label: 'Reuters' },
    { domain: 'presseportal.de', label: 'presseportal' },
    { domain: 'spiegel.de', label: 'SPIEGEL' },
    { domain: 'zeit.de', label: 'DIE ZEIT' },
    { domain: 'cio.de', label: 'CIO.de' },
  ],
}

export function normalizeSourceHost(raw: string | null | undefined): string {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    ?.trim()
  return s && s.includes('.') ? s : ''
}

export function getIndustrySourcePack(
  industryRaw: string | null | undefined,
): SourcePackDomain[] {
  const id = resolveIndustryId(industryRaw) || 'other'
  return INDUSTRY_SOURCE_PACKS[id] ?? INDUSTRY_SOURCE_PACKS.other
}

export function isHostInSourcePack(
  urlOrHost: string | null | undefined,
  pack: SourcePackDomain[],
): boolean {
  const host = normalizeSourceHost(urlOrHost)
  if (!host) return false
  return pack.some((entry) => host === entry.domain || host.endsWith(`.${entry.domain}`))
}

export function isIndustryPackHost(
  urlOrHost: string | null | undefined,
  industryRaw: string | null | undefined,
): boolean {
  return isHostInSourcePack(urlOrHost, getIndustrySourcePack(industryRaw))
}

export function isPeoplePackHost(urlOrHost: string | null | undefined): boolean {
  return isHostInSourcePack(urlOrHost, PEOPLE_SOURCE_PACK)
}

/** Chunk Domains für Google-News site:-OR-Queries (Längenlimit). */
export function chunkDomains(domains: string[], size = 4): string[][] {
  const clean = domains.map((d) => normalizeSourceHost(d)).filter(Boolean)
  const chunks: string[][] = []
  for (let i = 0; i < clean.length; i += size) {
    chunks.push(clean.slice(i, i + size))
  }
  return chunks
}

function siteOrClause(domains: string[]): string {
  return `(${domains.map((d) => `site:${d}`).join(' OR ')})`
}

const JOB_EXCLUSIONS = [
  '-Stellenanzeige',
  '-Karriere',
  '-"m/w/d"',
  '-Recruiting',
  '-Jobsuche',
  '-Praktikum',
  '-Werkstudent',
].join(' ')

/**
 * Industry-Pack Queries: Firmenname + site:Fachmedien (gechunked).
 * Google News bleibt Fallback — diese Queries haben Priorität.
 */
export function buildIndustryPackRssQueries(
  companyName: string,
  industryRaw: string | null | undefined,
): string[] {
  const name = companyName.trim()
  if (!name) return []
  const pack = getIndustrySourcePack(industryRaw)
  const chunks = chunkDomains(
    pack.map((p) => p.domain),
    4,
  ).slice(0, 3)
  return chunks.map((domains) => `"${name}" ${siteOrClause(domains)} ${JOB_EXCLUSIONS}`)
}

/** Personen-Pack: Name (+ optional Firma) auf Führung-/Karriere-Fachmedien. */
export function buildPeoplePackRssQueries(
  personName: string,
  companyName?: string | null,
): string[] {
  const person = personName.trim()
  if (!person) return []
  const company = String(companyName ?? '').trim()
  const chunks = chunkDomains(
    PEOPLE_SOURCE_PACK.map((p) => p.domain),
    4,
  ).slice(0, 2)
  const subject = company ? `"${person}" "${company}"` : `"${person}"`
  return chunks.map((domains) => `${subject} ${siteOrClause(domains)}`)
}

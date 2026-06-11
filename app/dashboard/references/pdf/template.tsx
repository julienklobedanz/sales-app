import React from 'react'
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import type { PdfOrgBranding, PdfReference, PdfTemplate } from './types'
import { anonymizeReferenceForOutput } from './anonymization'
import { normalizeTextForPdfFlow } from './normalize-for-pdf'
import { formatIndustryDisplay } from '@/lib/constants/industries'
import { formatReferenceVolume } from '@/lib/format'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'
import { formatProjectStatusDe } from '@/lib/public-portfolio/kpis-for-reference'

/** A4: 20 mm top/bottom, 15 mm left/right */
const PAGE_MARGIN_V = 57
const PAGE_MARGIN_H = 43
const FOOTER_HEIGHT = 36

const COLORS = {
  heading: '#1e293b',
  body: '#334155',
  bodyMuted: '#475569',
  label: '#94a3b8',
  headerBg: '#1e293b',
  headerMuted: '#94a3b8',
  headerText: '#f8fafc',
  summaryBg: '#f8fafc',
  summaryBorder: '#6366f1',
  sidebarBg: '#f8fafc',
  sidebarBorder: '#e2e8f0',
  divider: '#e2e8f0',
  footer: '#94a3b8',
  quoteMark: '#cbd5e1',
} as const

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_MARGIN_V,
    paddingBottom: PAGE_MARGIN_V + FOOTER_HEIGHT,
    paddingHorizontal: PAGE_MARGIN_H,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: COLORS.body,
    position: 'relative',
  },
  headerBand: {
    backgroundColor: COLORS.headerBg,
    marginHorizontal: -PAGE_MARGIN_H,
    marginTop: -PAGE_MARGIN_V,
    paddingHorizontal: PAGE_MARGIN_H,
    paddingTop: 22,
    paddingBottom: 20,
    marginBottom: 0,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerLogo: { width: 72, height: 28, objectFit: 'contain' },
  headerEyebrow: {
    fontSize: 7,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: COLORS.headerMuted,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.headerText,
    marginBottom: 4,
    lineHeight: 1.15,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#cbd5e1',
    marginBottom: 0,
  },
  ndaHint: {
    fontSize: 8,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 8,
  },
  executiveSummary: {
    marginTop: 18,
    marginBottom: 6,
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 12,
    backgroundColor: COLORS.summaryBg,
    borderLeft: `4px solid ${COLORS.summaryBorder}`,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  executiveSummaryText: {
    fontSize: 10,
    lineHeight: 1.55,
    color: COLORS.heading,
  },
  columns: {
    flexDirection: 'row',
    gap: 22,
    marginTop: 14,
  },
  colStory: { width: '63%' },
  colSidebar: { width: '34%' },
  storySection: {
    marginBottom: 22,
    breakInside: 'avoid',
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: COLORS.label,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.55,
    color: COLORS.bodyMuted,
    marginBottom: 10,
  },
  factSheet: {
    backgroundColor: COLORS.sidebarBg,
    border: `1px solid ${COLORS.sidebarBorder}`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    breakInside: 'avoid',
  },
  factSheetTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.heading,
    marginBottom: 12,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 7,
    borderBottom: `1px solid ${COLORS.divider}`,
  },
  factRowLast: { borderBottom: 'none' },
  factLabel: { fontSize: 9, color: COLORS.label, maxWidth: '42%' },
  factValue: {
    fontSize: 9,
    fontWeight: 500,
    color: COLORS.heading,
    textAlign: 'right',
    maxWidth: '55%',
  },
  quoteCard: {
    backgroundColor: COLORS.sidebarBg,
    border: `1px solid ${COLORS.sidebarBorder}`,
    borderRadius: 14,
    padding: 16,
    breakInside: 'avoid',
  },
  quoteMark: {
    fontSize: 22,
    color: COLORS.quoteMark,
    marginBottom: 4,
    lineHeight: 1,
  },
  quoteText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: COLORS.bodyMuted,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  quoteAttribution: {
    fontSize: 8,
    color: COLORS.label,
    fontWeight: 500,
  },
  tagsBlock: { marginTop: 8 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  tag: {
    border: `1px solid ${COLORS.divider}`,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 8,
    color: COLORS.bodyMuted,
  },
  continuationStrip: {
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: `1px solid ${COLORS.divider}`,
  },
  continuationLabel: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: COLORS.label,
    marginBottom: 3,
  },
  continuationTitle: { fontSize: 11, fontWeight: 600, color: COLORS.heading },
  footer: {
    position: 'absolute',
    bottom: PAGE_MARGIN_V,
    left: PAGE_MARGIN_H,
    right: PAGE_MARGIN_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #f1f5f9',
    paddingTop: 10,
    fontSize: 8,
    color: COLORS.footer,
  },
  footerCenter: { textAlign: 'center', flex: 1 },
})

function factValue(
  raw: string | null | undefined,
  fallback = '—'
): string {
  const normalized = normalizeTextForPdfFlow(raw)
  if (normalized) return normalized
  const trimmed = raw?.trim()
  return trimmed || fallback
}

function keyFacts(reference: PdfReference): { label: string; value: string }[] {
  const status =
    formatProjectStatusDe(reference.project_status) ||
    factValue(reference.project_status)
  return [
    { label: 'Branche', value: factValue(formatIndustryDisplay(reference.industry)) },
    { label: 'Land', value: factValue(reference.country) },
    { label: 'Volumen', value: formatReferenceVolume(reference.volume_eur) || '—' },
    { label: 'Vertragsart', value: factValue(formatContractTypeDisplay(reference.contract_type)) },
    { label: 'Status', value: status },
    { label: 'Dienstleister', value: factValue(reference.incumbent_provider) },
    { label: 'Wettbewerber', value: factValue(reference.competitors) },
  ]
}

function titleTypography(titleText: string): { fontSize: number; lineHeight: number } {
  const len = titleText.length
  if (len > 72) return { fontSize: 16, lineHeight: 1.2 }
  if (len > 48) return { fontSize: 18, lineHeight: 1.22 }
  return { fontSize: 22, lineHeight: 1.15 }
}

function resolveHeaderLogo(reference: PdfReference, org: PdfOrgBranding, template: PdfTemplate) {
  if (template === 'anonymized') return org.logo_url
  return org.logo_url ?? reference.company_logo_url
}

function buildSubtitle(reference: PdfReference): string {
  const company = factValue(reference.company_name, '')
  const industry = factValue(formatIndustryDisplay(reference.industry), '')
  if (company && industry) return `${company} — ${industry}`
  return company || industry || '—'
}

function renderParagraphs(text: string) {
  const blocks = text.split('\n\n').filter((b) => b.trim())
  if (blocks.length === 0) {
    return <Text style={styles.paragraph}>—</Text>
  }
  return blocks.map((block, index) => (
    <Text key={`p-${index}`} style={styles.paragraph}>
      {block}
    </Text>
  ))
}

function StorySection({ label, text }: { label: string; text: string }) {
  const body = normalizeTextForPdfFlow(text) || '—'
  return (
    <View style={styles.storySection} wrap={false}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {renderParagraphs(body)}
    </View>
  )
}

function FactSheet({ reference }: { reference: PdfReference }) {
  const facts = keyFacts(reference)
  return (
    <View style={styles.factSheet} wrap={false}>
      <Text style={styles.factSheetTitle}>Projektdetails</Text>
      {facts.map((item, index) => (
        <View
          key={item.label}
          style={[styles.factRow, index === facts.length - 1 ? styles.factRowLast : {}]}
        >
          <Text style={styles.factLabel}>{item.label}</Text>
          <Text style={styles.factValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  )
}

function QuoteCard({ reference }: { reference: PdfReference }) {
  const quote = reference.approval_quote_approved?.trim()
  if (!quote) return null

  const name = reference.approval_reference_giver_name?.trim()
  const title = reference.approval_reference_giver_title?.trim()
  const attribution =
    name && title ? `— ${name}, ${title}` : name ? `— ${name}` : null

  return (
    <View style={styles.quoteCard} wrap={false}>
      <Text style={styles.quoteMark}>„</Text>
      <Text style={styles.quoteText}>{quote}</Text>
      {attribution ? <Text style={styles.quoteAttribution}>{attribution}</Text> : null}
    </View>
  )
}

function Sidebar({ reference }: { reference: PdfReference }) {
  return (
    <View style={styles.colSidebar}>
      <FactSheet reference={reference} />
      <QuoteCard reference={reference} />
    </View>
  )
}

function PremiumHeader({
  reference,
  org,
  template,
}: {
  reference: PdfReference
  org: PdfOrgBranding
  template: PdfTemplate
}) {
  const titleText = normalizeTextForPdfFlow(reference.title) || reference.title
  const tt = titleTypography(titleText)
  const logoUrl = resolveHeaderLogo(reference, org, template)
  const eyebrow =
    template === 'anonymized'
      ? 'REFERENZ-EXPOSÉ | ANONYMISIERT'
      : 'REFERENZ-EXPOSÉ | VERTRAULICH'

  return (
    <View style={styles.headerBand}>
      <View style={styles.headerTopRow}>
        {logoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
          <Image src={logoUrl} style={styles.headerLogo} />
        ) : (
          <Text style={{ fontSize: 11, fontWeight: 700, color: COLORS.headerText }}>{org.name}</Text>
        )}
        <Text style={styles.headerEyebrow}>{eyebrow}</Text>
      </View>
      <Text style={[styles.headerTitle, { fontSize: tt.fontSize, lineHeight: tt.lineHeight }]}>
        {titleText}
      </Text>
      <Text style={styles.headerSubtitle}>{buildSubtitle(reference)}</Text>
      {template === 'anonymized' ? (
        <Text style={styles.ndaHint}>
          Anonymisierte Referenz (NDA) – keine konkreten Kundendaten im Export.
        </Text>
      ) : null}
    </View>
  )
}

function ExecutiveSummaryBlock({ reference }: { reference: PdfReference }) {
  const summary = normalizeTextForPdfFlow(reference.summary)
  if (!summary) return null
  return (
    <View style={styles.executiveSummary} wrap={false}>
      <Text style={styles.executiveSummaryText}>{summary}</Text>
    </View>
  )
}

function PdfFooter({
  org,
  exportedAtLabel,
}: {
  org: PdfOrgBranding
  exportedAtLabel: string
}) {
  return (
    <View style={styles.footer} fixed>
      <Text>Erstellt am {exportedAtLabel}</Text>
      <Text style={styles.footerCenter}>{org.name}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`}
      />
    </View>
  )
}

function TagsBlock({ reference }: { reference: PdfReference }) {
  const tags = (reference.tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  if (tags.length === 0) return null
  return (
    <View style={styles.tagsBlock} wrap={false}>
      <Text style={styles.sectionLabel}>Tags</Text>
      <View style={styles.tagWrap}>
        {tags.map((tag, i) => (
          <Text key={`tag-${i}-${tag}`} style={styles.tag}>
            {tag}
          </Text>
        ))}
      </View>
    </View>
  )
}

function ContinuationHeader({ reference }: { reference: PdfReference }) {
  const titleText = normalizeTextForPdfFlow(reference.title) || reference.title
  const short = titleText.length > 80 ? `${titleText.slice(0, 77)}…` : titleText
  return (
    <View style={styles.continuationStrip}>
      <Text style={styles.continuationLabel}>Fortsetzung</Text>
      <Text style={styles.continuationTitle}>{short}</Text>
    </View>
  )
}

function shouldSplitMagazine(reference: PdfReference): boolean {
  const c = (normalizeTextForPdfFlow(reference.customer_challenge) || '').length
  const s = (normalizeTextForPdfFlow(reference.our_solution) || '').length
  const u = (normalizeTextForPdfFlow(reference.summary) || '').length
  return c + s > 2200 || c > 1100 || s > 1100 || u > 700
}

function MagazinePages({
  reference,
  org,
  template,
  exportedAtLabel,
  showTags,
}: {
  reference: PdfReference
  org: PdfOrgBranding
  template: PdfTemplate
  exportedAtLabel: string
  showTags: boolean
}) {
  const split = shouldSplitMagazine(reference)
  const challenge = reference.customer_challenge ?? ''
  const solution = reference.our_solution ?? ''

  if (!split) {
    return (
      <Page size="A4" style={styles.page}>
        <PremiumHeader reference={reference} org={org} template={template} />
        <ExecutiveSummaryBlock reference={reference} />
        <View style={styles.columns}>
          <View style={styles.colStory}>
            <StorySection label="Herausforderung" text={challenge} />
            <StorySection label="Unsere Lösung" text={solution} />
            {showTags ? <TagsBlock reference={reference} /> : null}
          </View>
          <Sidebar reference={reference} />
        </View>
        <PdfFooter org={org} exportedAtLabel={exportedAtLabel} />
      </Page>
    )
  }

  return (
    <>
      <Page size="A4" style={styles.page}>
        <PremiumHeader reference={reference} org={org} template={template} />
        <ExecutiveSummaryBlock reference={reference} />
        <View style={styles.columns}>
          <View style={styles.colStory}>
            <StorySection label="Herausforderung" text={challenge} />
          </View>
          <Sidebar reference={reference} />
        </View>
        <PdfFooter org={org} exportedAtLabel={exportedAtLabel} />
      </Page>
      <Page size="A4" style={styles.page}>
        <ContinuationHeader reference={reference} />
        <View style={styles.columns}>
          <View style={styles.colStory}>
            <StorySection label="Unsere Lösung" text={solution} />
            {showTags ? <TagsBlock reference={reference} /> : null}
          </View>
          <View style={styles.colSidebar} />
        </View>
        <PdfFooter org={org} exportedAtLabel={exportedAtLabel} />
      </Page>
    </>
  )
}

function renderReferencePages(
  reference: PdfReference,
  org: PdfOrgBranding,
  template: PdfTemplate,
  exportedAtLabel: string
) {
  const effective = template === 'anonymized' ? anonymizeReferenceForOutput(reference) : reference
  return (
    <MagazinePages
      reference={effective}
      org={org}
      template={template}
      exportedAtLabel={exportedAtLabel}
      showTags={template === 'detail'}
    />
  )
}

export function ReferencePdfDocument({
  reference,
  org,
  template,
  exportedAtLabel,
}: {
  reference: PdfReference
  org: PdfOrgBranding
  template: PdfTemplate
  exportedAtLabel: string
}) {
  return (
    <Document>
      {renderReferencePages(reference, org, template, exportedAtLabel)}
    </Document>
  )
}

export function ReferencePdfBundleDocument({
  references,
  org,
  template,
  exportedAtLabel,
}: {
  references: PdfReference[]
  org: PdfOrgBranding
  template: PdfTemplate
  exportedAtLabel: string
}) {
  return (
    <Document>
      {references.map((reference) => (
        <React.Fragment key={reference.id}>
          {renderReferencePages(reference, org, template, exportedAtLabel)}
        </React.Fragment>
      ))}
    </Document>
  )
}

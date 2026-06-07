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
import { formatReferenceVolume } from '@/lib/format'
import { formatContractTypeDisplay } from '@/lib/references/contract-type'

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 11, fontFamily: 'Helvetica', color: '#0f172a', position: 'relative' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logo: { width: 64, height: 24, objectFit: 'contain' },
  heading: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subHeading: { fontSize: 12, color: '#334155', marginBottom: 4 },
  ndaHint: { fontSize: 9, color: '#64748b', fontStyle: 'italic', marginBottom: 6 },
  exportMeta: { fontSize: 8, color: '#64748b', marginBottom: 10 },
  muted: { color: '#64748b' },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, textTransform: 'uppercase', color: '#475569', marginBottom: 5 },
  storyCardSectionTitle: { fontSize: 10, textTransform: 'uppercase', color: '#475569', marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  card: { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 },
  storyCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { border: '1px solid #cbd5e1', borderRadius: 10, paddingVertical: 2, paddingHorizontal: 6, fontSize: 9 },
  tagMore: { fontSize: 8, color: '#64748b', marginTop: 4 },
  bodyText: { lineHeight: 1.45, textAlign: 'left' },
  footer: { position: 'absolute', bottom: 20, left: 28, right: 28, fontSize: 8, color: '#94a3b8', textAlign: 'right' },
  continuationLabel: { fontSize: 8, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 },
  continuationTitle: { fontSize: 11, color: '#334155', marginBottom: 14 },
})

function pdfStatusLabelDe(status: string): string {
  const s = String(status ?? '').toLowerCase()
  if (s === 'approved' || s === 'external') return 'Freigegeben'
  if (s === 'internal_only' || s === 'internal') return 'Intern'
  if (s === 'anonymized' || s === 'anonymous') return 'Anonymisiert'
  if (s === 'pending') return 'Freigabe ausstehend'
  return 'Entwurf'
}

function footerStatusLine(reference: PdfReference, template: PdfTemplate): string {
  if (template === 'anonymized') return 'Anonymisiert (NDA)'
  return pdfStatusLabelDe(reference.status)
}

function keyFacts(reference: PdfReference) {
  const v = (s: string | null | undefined, fallback = '—') => normalizeTextForPdfFlow(s) || s?.trim() || fallback
  return [
    { label: 'Branche', value: v(reference.industry) },
    { label: 'Land', value: v(reference.country) },
    { label: 'Volumen', value: formatReferenceVolume(reference.volume_eur) || '—' },
    { label: 'Vertragsart', value: v(formatContractTypeDisplay(reference.contract_type)) },
    { label: 'Projektstatus', value: v(reference.project_status) },
  ]
}

function titleTypography(titleText: string): { fontSize: number; lineHeight: number } {
  const len = titleText.length
  if (len > 88) return { fontSize: 13, lineHeight: 1.28 }
  if (len > 54) return { fontSize: 15, lineHeight: 1.32 }
  return { fontSize: 18, lineHeight: 1.22 }
}

function renderHeader(org: PdfOrgBranding) {
  return (
    <View style={styles.topBar}>
      <View>
        <Text style={[styles.sectionTitle, { color: org.primary_color }]}>RefStack Export</Text>
        <Text>{org.name}</Text>
      </View>
      {org.logo_url ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
        <Image src={org.logo_url} style={styles.logo} />
      ) : null}
    </View>
  )
}

function renderFacts(reference: PdfReference, org: PdfOrgBranding) {
  return (
    <View style={[styles.section, styles.card, { border: `1px solid ${org.secondary_color}` }]}>
      <Text style={[styles.sectionTitle, { color: org.secondary_color }]}>Projektdetails</Text>
      {keyFacts(reference).map((item) => (
        <View key={item.label} style={styles.metaRow}>
          <Text style={[styles.muted, { color: org.secondary_color }]}>{item.label}</Text>
          <Text>{item.value}</Text>
        </View>
      ))}
    </View>
  )
}

function renderStoryCard(label: string, body: string, org: PdfOrgBranding) {
  return (
    <View style={styles.storyCard}>
      <Text style={[styles.storyCardSectionTitle, { color: org.secondary_color }]}>{label}</Text>
      <Text style={styles.bodyText}>{body}</Text>
    </View>
  )
}

function renderChallengeOnly(reference: PdfReference, org: PdfOrgBranding) {
  const challenge = normalizeTextForPdfFlow(reference.customer_challenge) || '—'
  return <View style={styles.section}>{renderStoryCard('Herausforderung', challenge, org)}</View>
}

function renderSolutionAndSummary(reference: PdfReference, org: PdfOrgBranding) {
  const solution = normalizeTextForPdfFlow(reference.our_solution) || '—'
  const summary = normalizeTextForPdfFlow(reference.summary) || '—'
  return (
    <View style={styles.section}>
      {renderStoryCard('Lösung', solution, org)}
      {renderStoryCard('Kurzfassung', summary, org)}
    </View>
  )
}

function renderFullStory(reference: PdfReference, org: PdfOrgBranding) {
  const challenge = normalizeTextForPdfFlow(reference.customer_challenge) || '—'
  const solution = normalizeTextForPdfFlow(reference.our_solution) || '—'
  const summary = normalizeTextForPdfFlow(reference.summary) || '—'
  return (
    <View style={styles.section}>
      {renderStoryCard('Herausforderung', challenge, org)}
      {renderStoryCard('Lösung', solution, org)}
      {renderStoryCard('Kurzfassung', summary, org)}
    </View>
  )
}

function renderTags(reference: PdfReference, org: PdfOrgBranding) {
  const tags = (reference.tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  if (tags.length === 0) return null
  const shown = tags.slice(0, 3)
  const more = tags.length - 3
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: org.secondary_color }]}>Tags</Text>
      <View style={styles.tagWrap}>
        {shown.map((tag, i) => (
          <Text
            key={`tag-${i}-${tag}`}
            style={[styles.tag, { border: `1px solid ${org.secondary_color}`, color: org.secondary_color }]}
          >
            {tag}
          </Text>
        ))}
      </View>
      {more > 0 ? <Text style={styles.tagMore}>+{more} weitere</Text> : null}
    </View>
  )
}

function TitleBlock({
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
  const titleText = normalizeTextForPdfFlow(reference.title) || reference.title
  const tt = titleTypography(titleText)
  const sub = normalizeTextForPdfFlow(reference.company_name) || reference.company_name
  const statusLine = footerStatusLine(reference, template)
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={[styles.heading, { fontSize: tt.fontSize, lineHeight: tt.lineHeight }]}>{titleText}</Text>
      <Text style={[styles.subHeading, { color: org.secondary_color }]}>{sub}</Text>
      {template === 'anonymized' ? (
        <Text style={styles.ndaHint}>
          Anonymisierte Referenz (NDA) – keine konkreten Kundendaten im Export.
        </Text>
      ) : null}
      <Text style={styles.exportMeta}>
        Export: {exportedAtLabel} · {statusLine}
      </Text>
    </View>
  )
}

function renderPdfFooter(
  org: PdfOrgBranding,
  exportedAtLabel: string,
  reference: PdfReference,
  template: PdfTemplate,
  suffix?: string
) {
  const statusLine = footerStatusLine(reference, template)
  const tail = suffix ? ` · ${suffix}` : ''
  return (
    <Text style={[styles.footer, { color: org.secondary_color }]}>
      Erstellt mit RefStack · {org.name} · {exportedAtLabel} · {statusLine}
      {tail}
    </Text>
  )
}

function shouldSplitOnePager(reference: PdfReference): boolean {
  const c = (normalizeTextForPdfFlow(reference.customer_challenge) || '').length
  const s = (normalizeTextForPdfFlow(reference.our_solution) || '').length
  const u = (normalizeTextForPdfFlow(reference.summary) || '').length
  return c + s + u > 2000 || c > 900 || s > 900 || u > 650
}

function ContinuationHeader({ reference }: { reference: PdfReference }) {
  const titleText = normalizeTextForPdfFlow(reference.title) || reference.title
  const short = titleText.length > 85 ? `${titleText.slice(0, 82)}…` : titleText
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={styles.continuationLabel}>Fortsetzung</Text>
      <Text style={styles.continuationTitle}>{short}</Text>
    </View>
  )
}

function OnePager({
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
  const split = shouldSplitOnePager(reference)

  if (!split) {
    return (
      <Page size="A4" style={styles.page}>
        {renderHeader(org)}
        <TitleBlock reference={reference} org={org} template={template} exportedAtLabel={exportedAtLabel} />
        {renderFacts(reference, org)}
        {renderFullStory(reference, org)}
        {renderTags(reference, org)}
        {renderPdfFooter(org, exportedAtLabel, reference, template)}
      </Page>
    )
  }

  return (
    <>
      <Page size="A4" style={styles.page}>
        {renderHeader(org)}
        <TitleBlock reference={reference} org={org} template={template} exportedAtLabel={exportedAtLabel} />
        {renderFacts(reference, org)}
        {renderChallengeOnly(reference, org)}
      </Page>
      <Page size="A4" style={styles.page}>
        <ContinuationHeader reference={reference} />
        {renderSolutionAndSummary(reference, org)}
        {renderTags(reference, org)}
        {renderPdfFooter(org, exportedAtLabel, reference, template)}
      </Page>
    </>
  )
}

function DetailPages({
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
    <>
      <Page size="A4" style={styles.page}>
        {renderHeader(org)}
        <TitleBlock reference={reference} org={org} template={template} exportedAtLabel={exportedAtLabel} />
        {renderFacts(reference, org)}
      </Page>
      <Page size="A4" style={styles.page}>
        <ContinuationHeader reference={reference} />
        {renderFullStory(reference, org)}
        {renderTags(reference, org)}
        {renderPdfFooter(org, exportedAtLabel, reference, template, 'Detail Export')}
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
  return template === 'detail' ? (
    <DetailPages reference={effective} org={org} template={template} exportedAtLabel={exportedAtLabel} />
  ) : (
    <OnePager reference={effective} org={org} template={template} exportedAtLabel={exportedAtLabel} />
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

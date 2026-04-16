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

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 11, fontFamily: 'Helvetica', color: '#0f172a' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logo: { width: 64, height: 24, objectFit: 'contain' },
  heading: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  subHeading: { fontSize: 12, color: '#334155', marginBottom: 8 },
  muted: { color: '#64748b' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 10, textTransform: 'uppercase', color: '#475569', marginBottom: 5 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  card: { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { border: '1px solid #cbd5e1', borderRadius: 10, paddingVertical: 2, paddingHorizontal: 6, fontSize: 9 },
  divider: { borderBottom: '1px solid #e2e8f0', marginVertical: 10 },
  footer: { position: 'absolute', bottom: 16, left: 28, right: 28, fontSize: 9, color: '#94a3b8', textAlign: 'right' },
})

function keyFacts(reference: PdfReference) {
  return [
    { label: 'Account', value: reference.company_name || '—' },
    { label: 'Branche', value: reference.industry || '—' },
    { label: 'Land', value: reference.country || '—' },
    { label: 'Volumen', value: reference.volume_eur || '—' },
    { label: 'Vertragsart', value: reference.contract_type || '—' },
    { label: 'Projektstatus', value: reference.project_status || '—' },
  ]
}

function renderHeader(org: PdfOrgBranding) {
  return (
    <View style={styles.topBar}>
      <View>
        <Text style={[styles.sectionTitle, { color: org.primary_color }]}>RefStack Export</Text>
        <Text>{org.name}</Text>
      </View>
      {org.logo_url ? <Image src={org.logo_url} style={styles.logo} /> : null}
    </View>
  )
}

function renderFacts(reference: PdfReference) {
  return (
    <View style={[styles.section, styles.card]}>
      <Text style={styles.sectionTitle}>Projektdetails</Text>
      {keyFacts(reference).map((item) => (
        <View key={item.label} style={styles.metaRow}>
          <Text style={styles.muted}>{item.label}</Text>
          <Text>{item.value}</Text>
        </View>
      ))}
    </View>
  )
}

function renderStory(reference: PdfReference) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Herausforderung</Text>
      <Text>{reference.customer_challenge || '—'}</Text>
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Lösung</Text>
      <Text>{reference.our_solution || '—'}</Text>
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Kurzfassung</Text>
      <Text>{reference.summary || '—'}</Text>
    </View>
  )
}

function renderTags(reference: PdfReference) {
  const tags = (reference.tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  if (tags.length === 0) return null
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tags</Text>
      <View style={styles.tagWrap}>
        {tags.map((tag) => (
          <Text key={tag} style={styles.tag}>
            {tag}
          </Text>
        ))}
      </View>
    </View>
  )
}

function OnePager({ reference, org }: { reference: PdfReference; org: PdfOrgBranding }) {
  return (
    <Page size="A4" style={styles.page}>
      {renderHeader(org)}
      <Text style={styles.heading}>{reference.title}</Text>
      <Text style={styles.subHeading}>{reference.company_name}</Text>
      {renderFacts(reference)}
      {renderStory(reference)}
      {renderTags(reference)}
      <Text style={styles.footer}>Erstellt mit RefStack</Text>
    </Page>
  )
}

function DetailPages({ reference, org }: { reference: PdfReference; org: PdfOrgBranding }) {
  return (
    <>
      <Page size="A4" style={styles.page}>
        {renderHeader(org)}
        <Text style={styles.heading}>{reference.title}</Text>
        <Text style={styles.subHeading}>{reference.company_name}</Text>
        {renderFacts(reference)}
        <Text style={styles.footer}>RefStack Detail Export - Seite 1</Text>
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>Herausforderung und Lösung</Text>
        {renderStory(reference)}
        {renderTags(reference)}
        <Text style={styles.footer}>RefStack Detail Export - Seite 2</Text>
      </Page>
    </>
  )
}

export function ReferencePdfDocument({
  reference,
  org,
  template,
}: {
  reference: PdfReference
  org: PdfOrgBranding
  template: PdfTemplate
}) {
  const effective = template === 'anonymized'
    ? anonymizeReferenceForOutput(reference)
    : reference

  return (
    <Document>
      {template === 'detail' ? (
        <DetailPages reference={effective} org={org} />
      ) : (
        <OnePager reference={effective} org={org} />
      )}
    </Document>
  )
}

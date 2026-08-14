import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { normalizeTextForPdfFlow } from '@/lib/references/library/pdf/normalize-for-pdf'
import { parseExecutiveBriefingPdfSections } from '@/lib/deal-desk/executive-briefing'

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#334155',
  },
  headerBand: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 48,
    paddingTop: 28,
    paddingBottom: 24,
    marginBottom: 0,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#f8fafc',
    lineHeight: 1.25,
    marginBottom: 10,
  },
  preamble: {
    fontSize: 10,
    lineHeight: 1.45,
    color: '#cbd5e1',
  },
  recBox: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recText: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    color: '#f8fafc',
    textTransform: 'uppercase',
  },
  content: {
    paddingHorizontal: 48,
    paddingTop: 22,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 0.75,
    borderBottomColor: '#e2e8f0',
  },
  sectionBody: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#334155',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
})

export function ExecutiveBriefingPdfDocument({
  title,
  bodyText,
  generatedLabel,
}: {
  title: string
  bodyText: string
  generatedLabel: string
}) {
  const parsed = parseExecutiveBriefingPdfSections(bodyText)
  const preamble = normalizeTextForPdfFlow(parsed.preamble)
  const rec = parsed.recommendation?.trim() || null

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <Text style={styles.eyebrow}>RefStack · Executive Briefing · Vertraulich</Text>
          <Text style={styles.title}>{title}</Text>
          {preamble ? <Text style={styles.preamble}>{preamble}</Text> : null}
          {rec ? (
            <View style={styles.recBox}>
              <Text style={styles.recText}>{rec}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.content}>
          {parsed.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              <Text style={styles.sectionBody}>
                {normalizeTextForPdfFlow(section.body)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer} fixed>
          {generatedLabel} · Internes Freigabe-Dokument — vertraulich
        </Text>
      </Page>
    </Document>
  )
}

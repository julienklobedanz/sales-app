import React from 'react'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { normalizeTextForPdfFlow } from '@/lib/references/library/pdf/normalize-for-pdf'

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#334155',
  },
  headerBand: {
    backgroundColor: '#1e293b',
    marginHorizontal: -48,
    marginTop: -48,
    paddingHorizontal: 48,
    paddingVertical: 22,
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f8fafc',
    lineHeight: 1.25,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.55,
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
  const normalized = normalizeTextForPdfFlow(bodyText)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <Text style={styles.eyebrow}>RefStack · Executive Briefing</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.body}>{normalized}</Text>
        <Text style={styles.footer} fixed>
          {generatedLabel} · Internes Freigabe-Dokument — vertraulich
        </Text>
      </Page>
    </Document>
  )
}

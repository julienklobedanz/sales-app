import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Path,
} from '@react-pdf/renderer'

export type StoryPdfModel = {
  title: string
  companyName: string
  statusLabel: string
  tags: string[]

  customerChallenge: string
  ourSolution: string

  project: {
    volume: string
    contractType: string
    startDate: string
    endOrDuration: string
    incumbentProvider: string
    competitors: string
  }

  enterprise: {
    industry: string
    hq: string
    employeeCount: string
  }
}

function RefstackLogo({ width = 70, height = 36 }: { width?: number; height?: number }) {
  // Logo: schwarze Box + weiße, schräg verlaufende Balken.
  // (Kein externes Asset nötig, damit es in der PDF-Generierung zuverlässig funktioniert.)
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 70 36">
        <Rect x="0" y="0" width="70" height="36" fill="#0B0B0F" rx="6" />
        {/* Diagonale Balken */}
        <Path d="M8 30 L28 10 L36 10 L16 30 Z" fill="#FFFFFF" />
        <Path d="M26 30 L46 10 L54 10 L34 30 Z" fill="#FFFFFF" />
      </Svg>
    </View>
  )
}

export default function StoryPdfTemplate({ model }: { model: StoryPdfModel }) {
  const styles = getStyles()

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <RefstackLogo width={78} height={40} />
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Text style={styles.headerCompany}>{model.companyName}</Text>
            <Text style={styles.headerTitle}>{model.title}</Text>
          </View>
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{model.statusLabel}</Text>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tagsRow}>
          {model.tags.length > 0 ? (
            model.tags.slice(0, 12).map((t) => (
              <View key={t} style={styles.tagChip}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Tags: —</Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Challenge / Solution */}
        <Section styles={styles} title="Herausforderung des Kunden">
          <Text style={styles.sectionBodyText}>
            {model.customerChallenge || '—'}
          </Text>
        </Section>

        <Section styles={styles} title="Unsere Loesung">
          <Text style={styles.sectionBodyText}>
            {model.ourSolution || '—'}
          </Text>
        </Section>

        {/* Projektdetails */}
        <View style={styles.twoColGrid}>
          <View style={styles.col}>
            <Section styles={styles} title="Projektdetails">
              <Text style={styles.kvLine}>Volumen: {model.project.volume}</Text>
              <Text style={styles.kvLine}>Vertragsart: {model.project.contractType}</Text>
              <Text style={styles.kvLine}>Projektstart: {model.project.startDate}</Text>
              <Text style={styles.kvLine}>Laufzeit: {model.project.endOrDuration}</Text>
            </Section>
          </View>
          <View style={styles.col}>
            <Section styles={styles} title="Anbieter & Wettbewerber">
              <Text style={styles.kvLine}>Dienstleister: {model.project.incumbentProvider}</Text>
              <Text style={styles.kvLine}>Wettbewerber: {model.project.competitors}</Text>
            </Section>
          </View>
        </View>

        {/* Unternehemensdetails */}
        <View style={styles.twoColGrid}>
          <View style={styles.col}>
            <Section styles={styles} title="Unternehmensdetails">
              <Text style={styles.kvLine}>Industrie: {model.enterprise.industry}</Text>
              <Text style={styles.kvLine}>HQ: {model.enterprise.hq}</Text>
              <Text style={styles.kvLine}>Mitarbeiterzahl: {model.enterprise.employeeCount}</Text>
            </Section>
          </View>
          <View style={styles.col}>
            <View style={styles.footerNote}>
              <Text style={styles.footerSmall}>
                Refstack Success Story – exportiert aus den Account-Daten.
              </Text>
              <Text style={styles.footerSmall}>Seite 1</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

function Section({
  styles,
  title,
  children,
}: {
  styles: ReturnType<typeof getStyles>
  title: string
  children: React.ReactNode
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

// NOTE: style helper below (react-pdf needs static StyleSheet)
function getStyles() {
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 10.5,
      paddingTop: 26,
      paddingHorizontal: 28,
      paddingBottom: 24,
      backgroundColor: '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 10,
    },
    headerCompany: {
      fontSize: 11,
      color: '#6B7280',
      fontWeight: 600,
      marginBottom: 3,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 800,
      color: '#0B0B0F',
      lineHeight: 1.1,
    },
    statusBox: {
      marginLeft: 'auto',
      borderRadius: 8,
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      maxWidth: 120,
    },
    statusText: {
      fontSize: 10.5,
      fontWeight: 800,
      color: '#111827',
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    tagChip: {
      backgroundColor: '#F3F4F6',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: 2,
      marginBottom: 4,
    },
    tagText: {
      fontSize: 9.5,
      color: '#111827',
      fontWeight: 700,
    },
    divider: {
      height: 1,
      backgroundColor: '#E5E7EB',
      marginTop: 6,
      marginBottom: 6,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 900,
      color: '#374151',
      marginBottom: 6,
    },
    sectionBody: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 10,
      backgroundColor: '#FAFAFB',
    },
    sectionBodyText: {
      fontSize: 10.5,
      color: '#111827',
      lineHeight: 1.35,
      whiteSpace: 'pre-wrap',
    },
    twoColGrid: {
      flexDirection: 'row',
      gap: 14,
      marginTop: 10,
    },
    col: {
      flex: 1,
    },
    kvLine: {
      fontSize: 10.5,
      color: '#111827',
      marginBottom: 4,
      lineHeight: 1.25,
    },
    footerNote: {
      marginTop: 34,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#F9FAFB',
    },
    footerSmall: {
      fontSize: 9.2,
      color: '#6B7280',
      lineHeight: 1.2,
    },
    muted: {
      fontSize: 10,
      color: '#6B7280',
      fontWeight: 700,
    },
    // NOTE: Section component uses the styles passed in.
  })
}


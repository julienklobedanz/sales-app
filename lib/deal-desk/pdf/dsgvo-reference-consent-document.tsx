import React from 'react'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

const HIGHLIGHT = '#FEF08A'

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 52,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    lineHeight: 1.45,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerBrand: { fontSize: 11, fontWeight: 700, color: '#0f172a', maxWidth: 280 },
  logo: { width: 72, height: 28, objectFit: 'contain' },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#0f172a' },
  subtitle: { fontSize: 10, color: '#475569', marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  paragraph: { marginBottom: 8, textAlign: 'justify' },
  partiesBlock: { marginBottom: 12 },
  partyLine: { marginBottom: 6 },
  listItem: { marginLeft: 12, marginBottom: 4 },
  highlight: {
    backgroundColor: HIGHLIGHT,
    paddingVertical: 1,
    paddingHorizontal: 3,
  },
  signatureBlock: {
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  signatureLabel: { fontSize: 10, fontWeight: 700, marginBottom: 10 },
  signatureField: { marginBottom: 14 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
  },
})

function H({ children }: { children: string }) {
  return <Text style={styles.highlight}>{children}</Text>
}

export type DsgvoReferenceConsentPdfProps = {
  providerName: string
  providerLogoUrl?: string | null
}

export function DsgvoReferenceConsentDocument({
  providerName,
  providerLogoUrl,
}: DsgvoReferenceConsentPdfProps) {
  const provider = providerName.trim() || '[Name deines SaaS-Unternehmens]'

  return (
    <Document title="DSGVO-Einwilligungserklärung für Referenzpersonen">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerBrand}>{provider}</Text>
          {providerLogoUrl ? (
            // @react-pdf/renderer Image has no alt prop (PDF, not DOM).
            // eslint-disable-next-line jsx-a11y/alt-text -- decorative PDF logo
            <Image src={providerLogoUrl} style={styles.logo} />
          ) : null}
        </View>

        <Text style={styles.title}>DSGVO-Einwilligungserklärung für Referenzpersonen</Text>
        <Text style={styles.subtitle}>
          Einwilligungserklärung in die Verarbeitung personenbezogener Daten zum Zwecke der
          Referenznennung (Reference Calls)
        </Text>

        <View style={styles.partiesBlock}>
          <Text style={styles.partyLine}>
            Zwischen{' '}
            <H>[Name des Kundenunternehmens]</H> – nachfolgend „Arbeitgeber“ genannt – und{' '}
            <H>[Vorname Nachname des Mitarbeiters]</H> – nachfolgend „Mitarbeiter“ genannt –
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Präambel</Text>
        <Text style={styles.paragraph}>
          Der Arbeitgeber nutzt die Software-as-a-Service (SaaS)-Lösung der {provider} (nachfolgend
          „Dienstleister“). Im Rahmen der vertraglichen Vereinbarung zwischen dem Arbeitgeber und dem
          Dienstleister hat sich der Arbeitgeber bereit erklärt, als Referenzkunde zur Verfügung zu
          stehen. Dies beinhaltet die Möglichkeit, dass potenzielle Neukunden des Dienstleisters im
          Rahmen von sog. „Reference Calls“ direkt mit einem Ansprechpartner des Arbeitgebers Kontakt
          aufnehmen, um sich über die Erfahrungen mit der Software auszutauschen.
        </Text>
        <Text style={styles.paragraph}>
          Vor diesem Hintergrund willigt der Mitarbeiter freiwillig in die nachfolgend beschriebene
          Datenverarbeitung ein:
        </Text>

        <Text style={styles.sectionTitle}>§ 1 Gegenstand und Umfang der Einwilligung</Text>
        <Text style={styles.paragraph}>
          Der Mitarbeiter willigt ein, dass der Arbeitgeber folgende personenbezogene Daten des
          Mitarbeiters an den Dienstleister übermittelt:
        </Text>
        <Text style={styles.listItem}>• Vor- und Nachname</Text>
        <Text style={styles.listItem}>• Berufsbezeichnung / Position im Unternehmen</Text>
        <Text style={styles.listItem}>• Geschäftliche E-Mail-Adresse</Text>
        <Text style={styles.listItem}>• Geschäftliche Telefonnummer</Text>
        <Text style={styles.paragraph}>
          Der Mitarbeiter willigt ein, dass der Dienstleister diese Daten an potenzielle Neukunden und
          Mietinteressenten (ordnungsgemäß qualifizierte Leads) weitergibt, damit diese den Mitarbeiter
          zum Zwecke eines Referenzgesprächs (per Telefon oder Videokonferenz) kontaktieren können.
        </Text>
        <Text style={styles.paragraph}>
          Die Datenweitergabe und Kontaktaufnahme erfolgt ausschließlich im geschäftlichen Kontext und
          bezieht sich nur auf die Erfahrungen mit der genutzten SaaS-Lösung.
        </Text>

        <Text style={styles.sectionTitle}>§ 2 Freiwilligkeit und Widerrufsrecht</Text>
        <Text style={styles.paragraph}>
          Die Erteilung dieser Einwilligung erfolgt absolut freiwillig. Dem Mitarbeiter entstehen keine
          arbeitsrechtlichen oder sonstigen Nachteile, wenn er die Einwilligung nicht erteilt oder sie
          in Zukunft widerruft.
        </Text>
        <Text style={styles.paragraph}>
          Der Mitarbeiter hat das Recht, diese Einwilligung jederzeit mit Wirkung für die Zukunft zu
          widerrufen. Der Widerruf kann formlos (z. B. per E-Mail) gegenüber dem Arbeitgeber oder
          direkt gegenüber dem Dienstleister erklärt werden.
        </Text>
        <Text style={styles.paragraph}>
          Nach Zugang des Widerrufs werden die Kontaktdaten des Mitarbeiters unverzüglich aus den
          Referenzsystemen des Dienstleisters gelöscht und nicht mehr an Dritte weitergegeben. Die
          Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt unberührt.
        </Text>

        <Text style={styles.sectionTitle}>§ 3 Speicherdauer</Text>
        <Text style={styles.paragraph}>
          Die Daten werden für die Dauer der Vereinbarung über die Referenznennung zwischen dem
          Arbeitgeber und dem Dienstleister verarbeitet, es sei denn, der Mitarbeiter scheidet vorab aus
          dem Unternehmen aus oder widerruft diese Einwilligung. Der Arbeitgeber wird den Dienstleister
          unverzüglich informieren, wenn der Mitarbeiter das Unternehmen verlässt, damit die Daten
          gelöscht werden.
        </Text>

        <Text style={styles.sectionTitle}>§ 4 Betroffenenrechte</Text>
        <Text style={styles.paragraph}>
          Dem Mitarbeiter stehen bei Vorliegen der gesetzlichen Voraussetzungen die Rechte auf Auskunft
          (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der
          Verarbeitung (Art. 18 DSGVO) sowie auf Datenübertragbarkeit (Art. 20 DSGVO) zu. Zudem besteht
          ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde.
        </Text>

        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>Unterschrift / Einverständnis</Text>
          <Text style={styles.paragraph}>
            Ich habe die Datenschutzhinweise gelesen und verstanden. Ich willige in die Verarbeitung und
            Weitergabe meiner oben genannten geschäftlichen Kontaktdaten zum Zwecke von Referenzanfragen
            ein.
          </Text>
          <View style={styles.signatureField}>
            <Text style={{ marginBottom: 4 }}>
              <H>Ort, Datum</H>
            </Text>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#cbd5e1', height: 20 }} />
          </View>
          <View style={styles.signatureField}>
            <Text style={{ marginBottom: 4 }}>Unterschrift des Mitarbeiters</Text>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#cbd5e1', height: 28 }} />
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {provider} · DSGVO-Einwilligung Referenzpersonen · Ausfüllfelder gelb markiert
        </Text>
      </Page>
    </Document>
  )
}
